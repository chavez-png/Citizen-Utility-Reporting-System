const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

// Generate unique outage ID
function generateOutageId() {
  const date = new Date();
  const timestamp = date.getTime().toString().slice(-6);
  return `OUT-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}-${timestamp}`;
}

// CREATE OUTAGE
router.post('/create', authenticateToken, async (req, res) => {
  try {
    const {
      service_id,
      province_id,
      district_id,
      sector_id,
      reason,
      description,
      estimated_end_time,
      affected_locations,
      estimated_affected_users = 0,
      severity = 'high'
    } = req.body;

    if (!service_id || !province_id) {
      return res.status(400).json({ error: 'Service and province are required' });
    }

    const outage_id = generateOutageId();
    const start_time = new Date();

    const [result] = await db.query(
      `INSERT INTO outages (
        outage_id, service_id, province_id, district_id, sector_id,
        start_time, estimated_end_time, reason, description,
        affected_locations, estimated_affected_users, severity, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        outage_id, service_id, province_id, district_id || null, sector_id || null,
        start_time, estimated_end_time || null, reason || null, description || null,
        affected_locations || null, estimated_affected_users, severity, req.user.id
      ]
    );

    res.status(201).json({
      message: 'Outage created successfully',
      outage: {
        id: result.insertId,
        outage_id,
        status: 'active',
        created_at: start_time
      }
    });
  } catch (error) {
    console.error('Create outage error:', error);
    res.status(500).json({ error: 'Failed to create outage', details: error.message });
  }
});

// GET ALL OUTAGES
router.get('/', async (req, res) => {
  try {
    const { status, service_id, province_id, page = 1, limit = 20 } = req.query;
    let query = `
      SELECT 
        o.id, o.outage_id, o.service_id, o.reason, o.description,
        o.start_time, o.estimated_end_time, o.actual_end_time,
        o.status, o.severity, o.estimated_affected_users,
        o.created_at, o.updated_at,
        s.name as service_name,
        p.name as province_name,
        d.name as district_name,
        u.name as created_by_name
      FROM outages o
      JOIN services s ON o.service_id = s.id
      JOIN provinces p ON o.province_id = p.id
      LEFT JOIN districts d ON o.district_id = d.id
      JOIN users u ON o.created_by = u.id
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      query += ' AND o.status = ?';
      params.push(status);
    }
    if (service_id) {
      query += ' AND o.service_id = ?';
      params.push(service_id);
    }
    if (province_id) {
      query += ' AND o.province_id = ?';
      params.push(province_id);
    }

    // Pagination
    const offset = (page - 1) * limit;
    query += ' ORDER BY o.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);

    const [outages] = await db.query(query, params);

    // Get total count
    let countQuery = 'SELECT COUNT(*) as count FROM outages WHERE 1=1';
    const countParams = [];
    if (status) {
      countQuery += ' AND status = ?';
      countParams.push(status);
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
      outages,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get outages error:', error);
    res.status(500).json({ error: 'Failed to get outages', details: error.message });
  }
});

// GET OUTAGE BY STATUS AND PROVINCE
router.get('/status/:province', async (req, res) => {
  try {
    const [outages] = await db.query(
      `SELECT 
        o.id, o.outage_id, o.service_id, o.reason, o.status,
        o.start_time, o.estimated_end_time, o.severity,
        s.name as service_name
      FROM outages o
      JOIN services s ON o.service_id = s.id
      JOIN provinces p ON o.province_id = p.id
      WHERE (p.name = ? OR p.id = ?) AND o.status IN ('active', 'escalated')
      ORDER BY o.severity DESC, o.created_at DESC`,
      [req.params.province, req.params.province]
    );

    res.json({ outages });
  } catch (error) {
    console.error('Get province outages error:', error);
    res.status(500).json({ error: 'Failed to get outages', details: error.message });
  }
});

// UPDATE OUTAGE
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { status, reason, description, actual_end_time, severity, notes } = req.body;

    // Check if outage exists
    const [outages] = await db.query('SELECT id FROM outages WHERE id = ?', [req.params.id]);
    if (outages.length === 0) {
      return res.status(404).json({ error: 'Outage not found' });
    }

    let query = 'UPDATE outages SET ';
    const updates = [];
    const params = [];

    if (status) {
      updates.push('status = ?');
      params.push(status);
    }
    if (reason) {
      updates.push('reason = ?');
      params.push(reason);
    }
    if (description) {
      updates.push('description = ?');
      params.push(description);
    }
    if (actual_end_time) {
      updates.push('actual_end_time = ?');
      params.push(actual_end_time);
    }
    if (severity) {
      updates.push('severity = ?');
      params.push(severity);
    }
    if (notes) {
      updates.push('notes = ?');
      params.push(notes);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No updates provided' });
    }

    query += updates.join(', ');
    query += ' WHERE id = ?';
    params.push(req.params.id);

    await db.query(query, params);

    res.json({ message: 'Outage updated successfully' });
  } catch (error) {
    console.error('Update outage error:', error);
    res.status(500).json({ error: 'Failed to update outage', details: error.message });
  }
});

// DELETE/RESOLVE OUTAGE
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    // Soft delete - mark as resolved
    await db.query(
      'UPDATE outages SET status = ?, actual_end_time = NOW() WHERE id = ?',
      ['resolved', req.params.id]
    );

    res.json({ message: 'Outage resolved successfully' });
  } catch (error) {
    console.error('Delete outage error:', error);
    res.status(500).json({ error: 'Failed to resolve outage', details: error.message });
  }
});

module.exports = router;