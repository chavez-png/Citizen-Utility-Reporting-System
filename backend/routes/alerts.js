const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

// Generate unique alert ID
function generateAlertId() {
  const date = new Date();
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `ALT-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}-${random}`;
}

// SEND ALERT
router.post('/send', authenticateToken, async (req, res) => {
  try {
    const {
      service_id,
      title,
      message,
      target_province_id,
      target_district_id,
      target_sector_id,
      target_cell_id,
      send_sms = true,
      send_web = false,
      duration_hours = 24
    } = req.body;

    if (!service_id || !message) {
      return res.status(400).json({ error: 'Service and message are required' });
    }

    if (message.length > 160 && send_sms) {
      return res.status(400).json({ 
        error: 'SMS message cannot exceed 160 characters',
        message_length: message.length 
      });
    }

    const alert_id = generateAlertId();

    // Calculate recipient count based on targeting
    let recipientQuery = `
      SELECT COUNT(*) as count FROM users 
      WHERE role IN ('citizen', 'admin')
    `;
    const recipientParams = [];

    if (target_province_id) {
      recipientQuery += ' AND province_id = ?';
      recipientParams.push(target_province_id);
    }
    if (target_district_id) {
      recipientQuery += ' AND district_id = ?';
      recipientParams.push(target_district_id);
    }

    const [countResult] = await db.query(recipientQuery, recipientParams);
    const recipient_count = countResult[0].count;

    // Create alert
    const expires_at = new Date(Date.now() + duration_hours * 60 * 60 * 1000);
    
    const [result] = await db.query(
      `INSERT INTO alerts (
        alert_id, created_by, service_id, title, message,
        target_province_id, target_district_id, target_sector_id, target_cell_id,
        message_length, send_sms, send_web, recipient_count,
        duration_hours, expires_at, status, sent_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        alert_id, req.user.id, service_id, title || 'Alert', message,
        target_province_id || null, target_district_id || null, 
        target_sector_id || null, target_cell_id || null,
        message.length, send_sms ? 1 : 0, send_web ? 1 : 0, recipient_count,
        duration_hours, expires_at, 'sent'
      ]
    );

    // Get recipient list
    let recipientListQuery = `
      SELECT id, phone, email FROM users 
      WHERE role IN ('citizen', 'admin')
    `;
    const recipientListParams = [];

    if (target_province_id) {
      recipientListQuery += ' AND province_id = ?';
      recipientListParams.push(target_province_id);
    }
    if (target_district_id) {
      recipientListQuery += ' AND district_id = ?';
      recipientListParams.push(target_district_id);
    }

    const [recipients] = await db.query(recipientListQuery, recipientListParams);

    // Insert recipients (for tracking delivery)
    for (const recipient of recipients) {
      await db.query(
        'INSERT INTO alert_recipients (alert_id, user_id, delivery_method, delivery_status) VALUES (?, ?, ?, ?)',
        [result.insertId, recipient.id, (send_sms ? 'sms' : 'web'), 'sent']
      );
    }

    res.status(201).json({
      message: 'Alert sent successfully',
      alert: {
        id: result.insertId,
        alert_id,
        title: title || 'Alert',
        recipient_count,
        sent_count: recipient_count,
        status: 'sent',
        created_at: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Send alert error:', error);
    res.status(500).json({ error: 'Failed to send alert', details: error.message });
  }
});

// GET ALERT HISTORY
router.get('/history', async (req, res) => {
  try {
    const { page = 1, limit = 20, service_id, status } = req.query;

    let query = `
      SELECT 
        a.id, a.alert_id, a.title, a.message, a.status,
        a.recipient_count, a.sent_count,
        a.send_sms, a.send_web,
        a.created_at, a.sent_at, a.expires_at,
        s.name as service_name,
        u.name as created_by_name
      FROM alerts a
      JOIN services s ON a.service_id = s.id
      JOIN users u ON a.created_by = u.id
      WHERE 1=1
    `;
    const params = [];

    if (service_id) {
      query += ' AND a.service_id = ?';
      params.push(service_id);
    }
    if (status) {
      query += ' AND a.status = ?';
      params.push(status);
    }

    // Pagination
    const offset = (page - 1) * limit;
    query += ' ORDER BY a.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);

    const [alerts] = await db.query(query, params);

    // Get total count
    let countQuery = 'SELECT COUNT(*) as count FROM alerts WHERE 1=1';
    const countParams = [];
    if (service_id) {
      countQuery += ' AND service_id = ?';
      countParams.push(service_id);
    }
    if (status) {
      countQuery += ' AND status = ?';
      countParams.push(status);
    }

    const [countResult] = await db.query(countQuery, countParams);
    const total = countResult[0].count;

    res.json({
      alerts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get alert history error:', error);
    res.status(500).json({ error: 'Failed to get alert history', details: error.message });
  }
});

// GET ACTIVE ALERTS FOR A REGION
router.get('/active/:province_id', async (req, res) => {
  try {
    const [alerts] = await db.query(
      `SELECT 
        a.id, a.alert_id, a.title, a.message, a.status,
        a.created_at, a.expires_at,
        s.name as service_name
      FROM alerts a
      JOIN services s ON a.service_id = s.id
      WHERE a.target_province_id = ? 
        AND a.status = 'sent'
        AND a.expires_at > NOW()
      ORDER BY a.created_at DESC`,
      [req.params.province_id]
    );

    res.json({ alerts });
  } catch (error) {
    console.error('Get active alerts error:', error);
    res.status(500).json({ error: 'Failed to get active alerts', details: error.message });
  }
});

// GET ALERT DETAILS
router.get('/:id', async (req, res) => {
  try {
    const [alerts] = await db.query(
      `SELECT a.*, s.name as service_name, u.name as created_by_name
       FROM alerts a
       JOIN services s ON a.service_id = s.id
       JOIN users u ON a.created_by = u.id
       WHERE a.id = ?`,
      [req.params.id]
    );

    if (alerts.length === 0) {
      return res.status(404).json({ error: 'Alert not found' });
    }

    // Get recipients
    const [recipients] = await db.query(
      `SELECT ar.id, ar.user_id, ar.delivery_method, ar.delivery_status, ar.delivered_at,
              u.name, u.phone, u.email
       FROM alert_recipients ar
       JOIN users u ON ar.user_id = u.id
       WHERE ar.alert_id = ?`,
      [req.params.id]
    );

    res.json({
      alert: alerts[0],
      recipients: recipients
    });
  } catch (error) {
    console.error('Get alert error:', error);
    res.status(500).json({ error: 'Failed to get alert', details: error.message });
  }
});

module.exports = router;