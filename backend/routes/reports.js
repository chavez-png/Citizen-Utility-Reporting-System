const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

// Generate unique report ID
function generateReportId() {
  const date = new Date();
  const timestamp = date.getTime().toString().slice(-6);
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `RPT-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}-${timestamp}${random}`;
}

// SUBMIT - Create new report
router.post('/submit', authenticateToken, async (req, res) => {
  try {
    const {
      title,
      description,
      service_id,
      issue_type_id,
      priority,
      province_id,
      district_id,
      sector_id,
      cell_id,
      street_address,
      affected_people = 1,
      is_emergency = false,
      contact_method = 'phone'
    } = req.body;

    // Validation
    if (!title || !description || !service_id || !issue_type_id || !province_id || !district_id) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const report_id = generateReportId();

    const [result] = await db.query(
      `INSERT INTO reports (
        report_id, user_id, service_id, issue_type_id, title, description, 
        priority, province_id, district_id, sector_id, cell_id, street_address,
        affected_people, is_emergency, contact_method
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        report_id, req.user.id, service_id, issue_type_id, title, description,
        priority || 'medium', province_id, district_id, sector_id || null, cell_id || null,
        street_address || null, affected_people, is_emergency ? 1 : 0, contact_method
      ]
    );

    res.status(201).json({
      message: 'Report submitted successfully',
      report: {
        id: result.insertId,
        report_id,
        title,
        status: 'submitted',
        created_at: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Submit report error:', error);
    res.status(500).json({ error: 'Failed to submit report', details: error.message });
  }
});

// GET ALL REPORTS - List reports with filters
router.get('/', async (req, res) => {
  try {
    const { status, priority, service_id, province_id, page = 1, limit = 20 } = req.query;
    let query = `
      SELECT 
        r.id, r.report_id, r.title, r.description, r.priority, r.status,
        r.created_at, r.updated_at,
        u.name as submitter_name, u.email as submitter_email, u.phone as submitter_phone,
        s.name as service_name,
        p.name as province_name,
        d.name as district_name
      FROM reports r
      JOIN users u ON r.user_id = u.id
      JOIN services s ON r.service_id = s.id
      JOIN provinces p ON r.province_id = p.id
      JOIN districts d ON r.district_id = d.id
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      query += ' AND r.status = ?';
      params.push(status);
    }
    if (priority) {
      query += ' AND r.priority = ?';
      params.push(priority);
    }
    if (service_id) {
      query += ' AND r.service_id = ?';
      params.push(service_id);
    }
    if (province_id) {
      query += ' AND r.province_id = ?';
      params.push(province_id);
    }

    // Pagination
    const offset = (page - 1) * limit;
    query += ' ORDER BY r.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);

    const [reports] = await db.query(query, params);

    // Get total count
    let countQuery = 'SELECT COUNT(*) as count FROM reports WHERE 1=1';
    const countParams = [];
    if (status) {
      countQuery += ' AND status = ?';
      countParams.push(status);
    }
    if (priority) {
      countQuery += ' AND priority = ?';
      countParams.push(priority);
    }
    if (service_id) {
      countQuery += ' AND service_id = ?';
      countParams.push(service_id);
    }
    if (province_id) {
      countQuery += ' AND province_id = ?';
      countParams.push(province_id);
    }

    const [countResult] = await db.query(countQuery, countParams);
    const total = countResult[0].count;

    res.json({
      reports,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get reports error:', error);
    res.status(500).json({ error: 'Failed to get reports', details: error.message });
  }
});

// GET SINGLE REPORT
router.get('/:id', async (req, res) => {
  try {
    const [reports] = await db.query(
      `SELECT 
        r.*, 
        u.name as submitter_name, u.email as submitter_email,
        s.name as service_name,
        it.name as issue_type_name,
        p.name as province_name,
        d.name as district_name
      FROM reports r
      JOIN users u ON r.user_id = u.id
      JOIN services s ON r.service_id = s.id
      JOIN issue_types it ON r.issue_type_id = it.id
      JOIN provinces p ON r.province_id = p.id
      JOIN districts d ON r.district_id = d.id
      WHERE r.id = ?`,
      [req.params.id]
    );

    if (reports.length === 0) {
      return res.status(404).json({ error: 'Report not found' });
    }

    res.json({ report: reports[0] });
  } catch (error) {
    console.error('Get report error:', error);
    res.status(500).json({ error: 'Failed to get report', details: error.message });
  }
});

// UPDATE REPORT STATUS
router.put('/:id/status', authenticateToken, async (req, res) => {
  try {
    const { status, admin_notes } = req.body;

    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }

    const validStatuses = ['submitted', 'acknowledged', 'in_progress', 'resolved', 'closed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    // Check if report exists
    const [reports] = await db.query('SELECT id FROM reports WHERE id = ?', [req.params.id]);
    if (reports.length === 0) {
      return res.status(404).json({ error: 'Report not found' });
    }

    // Update report
    let query = 'UPDATE reports SET status = ?';
    const params = [status];

    if (admin_notes) {
      query += ', admin_notes = ?';
      params.push(admin_notes);
    }

    if (status === 'resolved') {
      query += ', resolved_at = NOW()';
    }

    query += ' WHERE id = ?';
    params.push(req.params.id);

    await db.query(query, params);

    res.json({ message: 'Report status updated successfully' });
  } catch (error) {
    console.error('Update report error:', error);
    res.status(500).json({ error: 'Failed to update report', details: error.message });
  }
});

// GET USER'S REPORTS
router.get('/user/:userId', async (req, res) => {
  try {
    const [reports] = await db.query(
      `SELECT r.*, s.name as service_name
       FROM reports r
       JOIN services s ON r.service_id = s.id
       WHERE r.user_id = ?
       ORDER BY r.created_at DESC`,
      [req.params.userId]
    );

    res.json({ reports });
  } catch (error) {
    console.error('Get user reports error:', error);
    res.status(500).json({ error: 'Failed to get user reports', details: error.message });
  }
});

module.exports = router;
