const express = require('express');
const router = express.Router();
const db = require('../config/database');
const bcrypt = require('bcryptjs');
const { authenticateToken, authorizeRole } = require('../middleware/auth');

// GET ALL USERS
router.get('/users', authenticateToken, authorizeRole(['super_admin', 'admin']), async (req, res) => {
  try {
    const { role, status, page = 1, limit = 20 } = req.query;
    let query = 'SELECT id, name, email, phone, role, organization, province_id, district_id, status, created_at FROM users WHERE 1=1';
    const params = [];

    if (role) {
      query += ' AND role = ?';
      params.push(role);
    }
    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }

    // Pagination
    const offset = (page - 1) * limit;
    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);

    const [users] = await db.query(query, params);

    // Get total count
    let countQuery = 'SELECT COUNT(*) as count FROM users WHERE 1=1';
    const countParams = [];
    if (role) {
      countQuery += ' AND role = ?';
      countParams.push(role);
    }
    if (status) {
      countQuery += ' AND status = ?';
      countParams.push(status);
    }

    const [countResult] = await db.query(countQuery, countParams);

    res.json({
      users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: countResult[0].count,
        pages: Math.ceil(countResult[0].count / limit)
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to get users', details: error.message });
  }
});

// CREATE NEW ADMIN USER
router.post('/users/create', authenticateToken, authorizeRole(['super_admin']), async (req, res) => {
  try {
    const { name, email, phone, password, role = 'admin', organization, province_id, district_id } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    // Check if email exists
    const [existing] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    const password_hash = await bcrypt.hash(password, 10);

    const [result] = await db.query(
      'INSERT INTO users (name, email, phone, password_hash, role, organization, province_id, district_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [name, email, phone || null, password_hash, role, organization || null, province_id || null, district_id || null]
    );

    res.status(201).json({
      message: 'User created successfully',
      user: {
        id: result.insertId,
        name,
        email,
        phone,
        role
      }
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Failed to create user', details: error.message });
  }
});

// UPDATE USER
router.put('/users/:id', authenticateToken, authorizeRole(['super_admin', 'admin']), async (req, res) => {
  try {
    const { name, phone, organization, province_id, district_id, status } = req.body;

    // Check if user exists
    const [users] = await db.query('SELECT id FROM users WHERE id = ?', [req.params.id]);
    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    let query = 'UPDATE users SET ';
    const updates = [];
    const params = [];

    if (name) {
      updates.push('name = ?');
      params.push(name);
    }
    if (phone) {
      updates.push('phone = ?');
      params.push(phone);
    }
    if (organization) {
      updates.push('organization = ?');
      params.push(organization);
    }
    if (province_id) {
      updates.push('province_id = ?');
      params.push(province_id);
    }
    if (district_id) {
      updates.push('district_id = ?');
      params.push(district_id);
    }
    if (status) {
      updates.push('status = ?');
      params.push(status);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No updates provided' });
    }

    query += updates.join(', ') + ' WHERE id = ?';
    params.push(req.params.id);

    await db.query(query, params);

    res.json({ message: 'User updated successfully' });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Failed to update user', details: error.message });
  }
});

// DELETE USER (soft delete)
router.delete('/users/:id', authenticateToken, authorizeRole(['super_admin']), async (req, res) => {
  try {
    await db.query('UPDATE users SET status = ? WHERE id = ?', ['inactive', req.params.id]);
    res.json({ message: 'User deactivated successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Failed to delete user', details: error.message });
  }
});

// GET LOCATION DATA (for dropdowns)
router.get('/locations/provinces', async (req, res) => {
  try {
    const [provinces] = await db.query('SELECT id, name FROM provinces ORDER BY name');
    res.json({ provinces });
  } catch (error) {
    console.error('Get provinces error:', error);
    res.status(500).json({ error: 'Failed to get provinces', details: error.message });
  }
});

router.get('/locations/districts/:province_id', async (req, res) => {
  try {
    const [districts] = await db.query(
      'SELECT id, name FROM districts WHERE province_id = ? ORDER BY name',
      [req.params.province_id]
    );
    res.json({ districts });
  } catch (error) {
    console.error('Get districts error:', error);
    res.status(500).json({ error: 'Failed to get districts', details: error.message });
  }
});

router.get('/locations/sectors/:district_id', async (req, res) => {
  try {
    const [sectors] = await db.query(
      'SELECT id, name FROM sectors WHERE district_id = ? ORDER BY name',
      [req.params.district_id]
    );
    res.json({ sectors });
  } catch (error) {
    console.error('Get sectors error:', error);
    res.status(500).json({ error: 'Failed to get sectors', details: error.message });
  }
});

router.get('/locations/cells/:sector_id', async (req, res) => {
  try {
    const [cells] = await db.query(
      'SELECT id, name FROM cells WHERE sector_id = ? ORDER BY name',
      [req.params.sector_id]
    );
    res.json({ cells });
  } catch (error) {
    console.error('Get cells error:', error);
    res.status(500).json({ error: 'Failed to get cells', details: error.message });
  }
});

// GET SERVICES
router.get('/services', async (req, res) => {
  try {
    const [services] = await db.query('SELECT id, name, description FROM services ORDER BY name');
    res.json({ services });
  } catch (error) {
    console.error('Get services error:', error);
    res.status(500).json({ error: 'Failed to get services', details: error.message });
  }
});

// GET ISSUE TYPES BY SERVICE
router.get('/issue-types/:service_id', async (req, res) => {
  try {
    const [issues] = await db.query(
      'SELECT id, name, description FROM issue_types WHERE service_id = ? ORDER BY name',
      [req.params.service_id]
    );
    res.json({ issue_types: issues });
  } catch (error) {
    console.error('Get issue types error:', error);
    res.status(500).json({ error: 'Failed to get issue types', details: error.message });
  }
});

module.exports = router;