const express = require('express');
const db = require('../config/db');
const { auth } = require('../middleware/auth');
const router = express.Router();

router.get('/', auth, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT n.*,
        u.name evaluator_name,
        s.name evaluated_name,
        r2.name evaluated_rank
       FROM notifications n
       LEFT JOIN users u ON u.id=n.evaluator_id
       LEFT JOIN soldiers s ON s.id=n.evaluated_id
       LEFT JOIN ranks r2 ON r2.id=s.rank_id
       WHERE n.user_id=$1 OR n.user_id IS NULL
       ORDER BY n.created_at DESC
       LIMIT 50`,
      [req.user.id]
    );
    const unread = await db.query(
      'SELECT COUNT(*)::int count FROM notifications WHERE (user_id=$1 OR user_id IS NULL) AND NOT is_read',
      [req.user.id]
    );
    res.json({ notifications: rows, unreadCount: unread.rows[0].count });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/unread-count', auth, async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT COUNT(*)::int count FROM notifications WHERE (user_id=$1 OR user_id IS NULL) AND NOT is_read',
      [req.user.id]
    );
    res.json({ count: rows[0].count });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.patch('/:id/read', auth, async (req, res) => {
  try {
    await db.query(
      'UPDATE notifications SET is_read=true WHERE id=$1 AND (user_id=$2 OR user_id IS NULL)',
      [req.params.id, req.user.id]
    );
    res.json({ message: 'تم' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.patch('/read-all', auth, async (req, res) => {
  try {
    await db.query(
      'UPDATE notifications SET is_read=true WHERE (user_id=$1 OR user_id IS NULL) AND NOT is_read',
      [req.user.id]
    );
    res.json({ message: 'تم' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
