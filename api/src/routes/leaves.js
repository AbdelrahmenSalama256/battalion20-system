const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { auth } = require('../middleware/auth');

// GET /api/leaves — list all leaves with soldier info
router.get('/', auth, async (req, res) => {
  try {
    const { status, soldier_id } = req.query;
    let sql = `
      SELECT l.*, s.name as soldier_name, s.military_number,
             u.name as confirmed_by_name
      FROM leaves l
      JOIN soldiers s ON l.soldier_id = s.id
      LEFT JOIN users u ON l.confirmed_by = u.id
      WHERE 1=1
    `;
    const params = [];
    if (status) {
      params.push(status);
      sql += ` AND l.status = $${params.length}`;
    }
    if (soldier_id) {
      params.push(soldier_id);
      sql += ` AND l.soldier_id = $${params.length}`;
    }
    sql += ' ORDER BY l.created_at DESC';
    const { rows } = await db.query(sql, params);
    res.json({ leaves: rows });
  } catch (e) {
    console.error('GET /leaves error:', e.message);
    res.status(500).json({ error: 'خطأ في جلب الإجازات' });
  }
});

// GET /api/leaves/active — active leaves with remaining days
router.get('/active', auth, async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT l.*, s.name as soldier_name, s.military_number,
             (l.end_date - CURRENT_DATE) as remaining_days
      FROM leaves l
      JOIN soldiers s ON l.soldier_id = s.id
      WHERE l.status = 'active'
      ORDER BY l.end_date ASC
    `);
    res.json({ leaves: rows });
  } catch (e) {
    console.error('GET /leaves/active error:', e.message);
    res.status(500).json({ error: 'خطأ في جلب الإجازات النشطة' });
  }
});

// GET /api/leaves/overdue-return — soldiers whose leave ended but return not confirmed
router.get('/overdue-return', auth, async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT l.*, s.name as soldier_name, s.military_number,
             (CURRENT_DATE - l.end_date) as overdue_days
      FROM leaves l
      JOIN soldiers s ON l.soldier_id = s.id
      WHERE l.status = 'active'
        AND l.end_date < CURRENT_DATE
        AND l.return_confirmed = FALSE
      ORDER BY l.end_date ASC
    `);
    res.json({ leaves: rows });
  } catch (e) {
    console.error('GET /leaves/overdue-return error:', e.message);
    res.status(500).json({ error: 'خطأ' });
  }
});

// GET /api/leaves/needing-leave — soldiers >21 days without leave
router.get('/needing-leave', auth, async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT s.id, s.name, s.military_number, s.status as soldier_status,
             r.name as rank_name, rn.name_en as rank_name_en,
             COALESCE(
               (SELECT MAX(l.end_date) FROM leaves l WHERE l.soldier_id = s.id AND l.status = 'active'),
               s.last_leave_end,
               s.enlistment_date,
               s.created_at::date
             ) as last_leave,
             CURRENT_DATE - COALESCE(
               (SELECT MAX(l.end_date) FROM leaves l WHERE l.soldier_id = s.id AND l.status = 'active'),
               s.last_leave_end,
               s.enlistment_date,
               s.created_at::date
             ) as days_since_leave,
             CASE WHEN s.status = 'إجازة' THEN FALSE ELSE TRUE END as is_present
      FROM soldiers s
      LEFT JOIN ranks r ON s.rank_id = r.id
      LEFT JOIN rank_types rn ON r.type_id = rn.id
      WHERE s.is_active = TRUE
        AND (s.status IS DISTINCT FROM 'إجازة')
      HAVING CURRENT_DATE - COALESCE(
        (SELECT MAX(l.end_date) FROM leaves l WHERE l.soldier_id = s.id AND l.status = 'active'),
        s.last_leave_end,
        s.enlistment_date,
        s.created_at::date
      ) > 21
      ORDER BY days_since_leave DESC
    `);
    res.json({ soldiers: rows });
  } catch (e) {
    console.error('GET /leaves/needing-leave error:', e.message);
    res.status(500).json({ error: 'خطأ' });
  }
});

// POST /api/leaves — start a new leave
router.post('/', auth, async (req, res) => {
  try {
    const { soldier_id, start_date, end_date, leave_type, notes } = req.body;
    if (!soldier_id || !start_date || !end_date) {
      return res.status(400).json({ error: 'missing required fields' });
    }
    const { rows } = await db.query(
      `INSERT INTO leaves (soldier_id, start_date, end_date, leave_type, notes, confirmed_by)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [soldier_id, start_date, end_date, leave_type || 'regular', notes || null, req.user.id]
    );
    // Mark soldier as on leave
    await db.query(
      `UPDATE soldiers SET status = 'إجازة', last_leave_end = $1 WHERE id = $2`,
      [end_date, soldier_id]
    );
    // Notify commanders
    const { notifyAllCommanders } = require('../helpers/notification');
    const soldier = await db.query('SELECT name FROM soldiers WHERE id = $1', [soldier_id]);
    await notifyAllCommanders(
      'إجازة جديدة',
      `${soldier.rows[0]?.name || 'جندي'} بدأ إجازة من ${start_date} إلى ${end_date}`,
      'leave',
      { evaluatedId: soldier_id, evaluatedName: soldier.rows[0]?.name }
    );
    res.status(201).json(rows[0]);
  } catch (e) {
    console.error('POST /leaves error:', e.message);
    res.status(500).json({ error: 'خطأ في تسجيل الإجازة' });
  }
});

// PATCH /api/leaves/:id/confirm-return — confirm soldier returned
router.patch('/:id/confirm-return', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const leave = await db.query('SELECT * FROM leaves WHERE id = $1', [id]);
    if (!leave.rows.length) return res.status(404).json({ error: 'الإجازة غير موجودة' });

    const { rows } = await db.query(
      `UPDATE leaves SET return_confirmed = TRUE, return_confirmed_by = $1,
        return_confirmed_at = NOW(), status = 'completed'
       WHERE id = $2 RETURNING *`,
      [req.user.id, id]
    );
    // Set soldier back to active
    await db.query(
      `UPDATE soldiers SET status = 'نشط' WHERE id = $1`,
      [leave.rows[0].soldier_id]
    );
    const { notifyAllCommanders } = require('../helpers/notification');
    const soldier = await db.query('SELECT name FROM soldiers WHERE id = $1', [leave.rows[0].soldier_id]);
    await notifyAllCommanders(
      'عودة من إجازة',
      `${soldier.rows[0]?.name || 'جندي'} عاد من الإجازة وتم تأكيد حضوره`,
      'leave_return',
      { evaluatedId: leave.rows[0].soldier_id, evaluatedName: soldier.rows[0]?.name }
    );
    res.json(rows[0]);
  } catch (e) {
    console.error('PATCH /leaves/confirm-return error:', e.message);
    res.status(500).json({ error: 'خطأ في تأكيد العودة' });
  }
});

// PATCH /api/leaves/:id/cancel — cancel a leave
router.patch('/:id/cancel', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const leave = await db.query('SELECT * FROM leaves WHERE id = $1', [id]);
    if (!leave.rows.length) return res.status(404).json({ error: 'الإجازة غير موجودة' });
    const { rows } = await db.query(
      `UPDATE leaves SET status = 'cancelled' WHERE id = $1 RETURNING *`,
      [id]
    );
    // Restore previous status
    await db.query(
      `UPDATE soldiers SET status = 'نشط' WHERE id = $1 AND status = 'إجازة'`,
      [leave.rows[0].soldier_id]
    );
    res.json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: 'خطأ' });
  }
});

// GET /api/leaves/dashboard — full personnel dashboard data
router.get('/dashboard', auth, async (req, res) => {
  try {
    // Total soldiers
    const total = await db.query("SELECT COUNT(*) FROM soldiers WHERE is_active = TRUE");
    // On leave now
    const onLeave = await db.query("SELECT COUNT(*) FROM soldiers WHERE status = 'إجازة' AND is_active = TRUE");
    // Active leaves count
    const activeLeaves = await db.query("SELECT COUNT(*) FROM leaves WHERE status = 'active'");
    // Overdue return
    const overdueReturn = await db.query(`
      SELECT COUNT(*) FROM leaves
      WHERE status = 'active' AND end_date < CURRENT_DATE AND return_confirmed = FALSE
    `);
    // Needing leave (>21 days)
    const needingLeave = await db.query(`
      SELECT COUNT(*) FROM soldiers s
      WHERE s.is_active = TRUE AND (s.status IS DISTINCT FROM 'إجازة')
        AND CURRENT_DATE - COALESCE(
          (SELECT MAX(l.end_date) FROM leaves l WHERE l.soldier_id = s.id AND l.status = 'active'),
          s.last_leave_end, s.enlistment_date, s.created_at::date
        ) > 21
    `);
    // Returning today
    const returningToday = await db.query(`
      SELECT COUNT(*) FROM leaves l
      JOIN soldiers s ON l.soldier_id = s.id
      WHERE l.status = 'active' AND l.end_date = CURRENT_DATE AND l.return_confirmed = FALSE
    `);
    // Monthly leave stats (last 12 months)
    const monthlyStats = await db.query(`
      SELECT TO_CHAR(start_date, 'YYYY-MM') as month,
             COUNT(*) as leaves_count
      FROM leaves
      WHERE start_date >= CURRENT_DATE - INTERVAL '12 months'
      GROUP BY TO_CHAR(start_date, 'YYYY-MM')
      ORDER BY month
    `);
    // Soldier status distribution
    const statusDist = await db.query(`
      SELECT status, COUNT(*)::int as count
      FROM soldiers WHERE is_active = TRUE
      GROUP BY status
    `);
    // Upcoming return dates (next 7 days)
    const upcomingReturns = await db.query(`
      SELECT l.*, s.name as soldier_name, s.military_number,
             (l.end_date - CURRENT_DATE) as days_remaining
      FROM leaves l
      JOIN soldiers s ON l.soldier_id = s.id
      WHERE l.status = 'active' AND l.return_confirmed = FALSE
        AND l.end_date BETWEEN CURRENT_DATE AND CURRENT_DATE + 7
      ORDER BY l.end_date ASC
    `);

    res.json({
      total: parseInt(total.rows[0].count),
      onLeave: parseInt(onLeave.rows[0].count),
      activeLeaves: parseInt(activeLeaves.rows[0].count),
      overdueReturn: parseInt(overdueReturn.rows[0].count),
      needingLeave: parseInt(needingLeave.rows[0].count),
      returningToday: parseInt(returningToday.rows[0].count),
      monthlyStats: monthlyStats.rows,
      statusDistribution: statusDist.rows,
      upcomingReturns: upcomingReturns.rows,
    });
  } catch (e) {
    console.error('GET /leaves/dashboard error:', e.message);
    res.status(500).json({ error: 'خطأ' });
  }
});

module.exports = router;
