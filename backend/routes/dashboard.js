const express = require('express');
const router = express.Router();
const db = require('../config/database');

// GET DASHBOARD STATS
router.get('/stats', async (req, res) => {
  try {
    const stats = await Promise.all([
      // Total and active reports
      db.query(`
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN status IN ('submitted', 'acknowledged', 'in_progress') THEN 1 ELSE 0 END) as active,
          SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END) as resolved
        FROM reports
      `),
      // Active outages
      db.query(`
        SELECT COUNT(*) as active FROM outages WHERE status = 'active'
      `),
      // Alerts sent
      db.query(`
        SELECT COUNT(*) as total_sent FROM alerts WHERE status = 'sent'
      `),
      // Active users
      db.query(`
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN role = 'citizen' THEN 1 ELSE 0 END) as citizens,
          SUM(CASE WHEN role = 'admin' THEN 1 ELSE 0 END) as admins
        FROM users WHERE status = 'active'
      `),
      // High priority reports
      db.query(`
        SELECT COUNT(*) as count FROM reports WHERE priority IN ('high', 'critical') AND status != 'resolved'
      `),
      // Reports by service
      db.query(`
        SELECT s.name, COUNT(r.id) as count
        FROM services s
        LEFT JOIN reports r ON s.id = r.service_id
        GROUP BY s.id, s.name
      `),
      // Reports by status
      db.query(`
        SELECT status, COUNT(*) as count FROM reports GROUP BY status
      `)
    ]);

    const [reports] = stats[0];
    const [outages] = stats[1];
    const [alerts] = stats[2];
    const [users] = stats[3];
    const [urgent] = stats[4];
    const [reportsByService] = stats[5];
    const [reportsByStatus] = stats[6];

    res.json({
      summary: {
        total_reports: reports[0].total,
        active_reports: reports[0].active,
        resolved_reports: reports[0].resolved,
        active_outages: outages[0].active,
        total_alerts_sent: alerts[0].total_sent,
        total_users: users[0].total,
        active_citizens: users[0].citizens,
        active_admins: users[0].admins,
        urgent_reports: urgent[0].count
      },
      charts: {
        reports_by_service: reportsByService,
        reports_by_status: reportsByStatus
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ error: 'Failed to get dashboard stats', details: error.message });
  }
});

// GET ACTIVITY TIMELINE
router.get('/activity', async (req, res) => {
  try {
    const limit = req.query.limit || 10;

    // Recent reports
    const [recentReports] = await db.query(`
      SELECT 'report' as type, r.report_id as id, r.title, r.created_at, u.name
      FROM reports r
      JOIN users u ON r.user_id = u.id
      ORDER BY r.created_at DESC
      LIMIT ?
    `, [parseInt(limit)]);

    // Recent outages
    const [recentOutages] = await db.query(`
      SELECT 'outage' as type, o.outage_id as id, 
             CONCAT(s.name, ' outage in ', p.name) as title, 
             o.created_at, u.name
      FROM outages o
      JOIN services s ON o.service_id = s.id
      JOIN provinces p ON o.province_id = p.id
      JOIN users u ON o.created_by = u.id
      ORDER BY o.created_at DESC
      LIMIT ?
    `, [parseInt(limit)]);

    // Recent alerts
    const [recentAlerts] = await db.query(`
      SELECT 'alert' as type, a.alert_id as id, a.title, a.created_at, u.name
      FROM alerts a
      JOIN users u ON a.created_by = u.id
      ORDER BY a.created_at DESC
      LIMIT ?
    `, [parseInt(limit)]);

    // Combine and sort
    const activity = [...recentReports, ...recentOutages, ...recentAlerts]
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, limit);

    res.json({ activity });
  } catch (error) {
    console.error('Activity timeline error:', error);
    res.status(500).json({ error: 'Failed to get activity', details: error.message });
  }
});

module.exports = router;