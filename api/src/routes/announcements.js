const express = require('express');
const db = require('../config/db');
const { auth, commanderOnly } = require('../middleware/auth');
const { notifyAllUsers } = require('../helpers/notification');
const router = express.Router();

router.get('/', auth, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT a.*, u.name created_by_name
       FROM announcements a
       LEFT JOIN users u ON u.id = a.created_by
       WHERE a.is_active = true
       ORDER BY a.created_at DESC
       LIMIT 50`
    );
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT a.*, u.name created_by_name
       FROM announcements a
       LEFT JOIN users u ON u.id = a.created_by
       WHERE a.id = $1`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'الإعلان غير موجود' });
    res.json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/', auth, commanderOnly, async (req, res) => {
  try {
    const { title, content, priority } = req.body;
    if (!title || !content) return res.status(400).json({ error: 'يرجى إدخال العنوان والمحتوى' });

    const { rows } = await db.query(
      `INSERT INTO announcements (title, content, priority, created_by)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [title, content, priority || 'normal', req.user.id]
    );

    await notifyAllUsers(
      'إعلان جديد',
      `${title}: ${content.substring(0, 100)}`,
      'announcement',
      { announcementId: rows[0].id }
    );

    res.status(201).json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.put('/:id', auth, commanderOnly, async (req, res) => {
  try {
    const { title, content, priority, isActive } = req.body;
    const { rows } = await db.query(
      `UPDATE announcements SET title=$1, content=$2, priority=$3,
       is_active=$4, updated_at=NOW()
       WHERE id=$5 RETURNING *`,
      [title, content, priority || 'normal', isActive !== false, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'الإعلان غير موجود' });
    res.json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.delete('/:id', auth, commanderOnly, async (req, res) => {
  try {
    const { rowCount } = await db.query('DELETE FROM announcements WHERE id=$1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'الإعلان غير موجود' });
    res.json({ message: 'تم الحذف' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
