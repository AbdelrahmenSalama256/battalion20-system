const express = require('express');
const db = require('../config/db');
const { auth, commanderOnly } = require('../middleware/auth');
const router = express.Router();

router.get('/', auth, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT a.*, u.name created_by_name
       FROM announcements a
       LEFT JOIN users u ON u.id=a.created_by
       ORDER BY a.created_at DESC`
    );
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/', auth, commanderOnly, async (req, res) => {
  try {
    const { title, body, priority } = req.body;
    if (!title) return res.status(400).json({ error: 'يرجى إدخال عنوان الإعلان' });
    const { rows } = await db.query(
      'INSERT INTO announcements (title, body, priority, created_by) VALUES ($1,$2,$3,$4) RETURNING *',
      [title, body || null, priority || 'normal', req.user.id]
    );
    const creator = await db.query('SELECT name FROM users WHERE id=$1', [req.user.id]);
    res.status(201).json({ ...rows[0], created_by_name: creator.rows[0]?.name });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.delete('/:id', auth, commanderOnly, async (req, res) => {
  try {
    const { rowCount } = await db.query('DELETE FROM announcements WHERE id=$1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'الإعلان غير موجود' });
    res.json({ message: 'تم الحذف بنجاح' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
