const express = require('express');
const db = require('../config/db');
const { auth, commanderOnly } = require('../middleware/auth');
const { notifyAllCommanders } = require('../helpers/notification');
const router = express.Router();

router.get('/', auth, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT w.*, COUNT(s.id)::int as specialty_count
       FROM weapons w LEFT JOIN specialties s ON s.weapon_id=w.id
       GROUP BY w.id ORDER BY w.created_at`
    );
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/', auth, commanderOnly, async (req, res) => {
  try {
    const { name, color, icon } = req.body;
    if (!name) return res.status(400).json({ error: 'يرجى إدخال اسم السلاح' });
    const { rows } = await db.query(
      'INSERT INTO weapons (name, color, icon) VALUES ($1, $2, $3) RETURNING *',
      [name, color || '#2d6a4f', icon || '⚔️']
    );
    await notifyAllCommanders(
      'تنبيه النظام',
      `تم إضافة سلاح جديد: ${name}`,
      'system_alert'
    );
    res.status(201).json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.put('/:id', auth, commanderOnly, async (req, res) => {
  try {
    const { name, color, icon } = req.body;
    const { rows } = await db.query(
      'UPDATE weapons SET name=$1, color=$2, icon=$3 WHERE id=$4 RETURNING *',
      [name, color, icon, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'غير موجود' });
    res.json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.delete('/:id', auth, commanderOnly, async (req, res) => {
  try {
    const { rowCount } = await db.query('DELETE FROM weapons WHERE id=$1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'غير موجود' });
    res.json({ message: 'تم الحذف بنجاح' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
