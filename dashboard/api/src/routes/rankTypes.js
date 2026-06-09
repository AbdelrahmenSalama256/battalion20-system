const express = require('express');
const db = require('../config/db');
const { auth, commanderOnly } = require('../middleware/auth');
const router = express.Router();

router.get('/', auth, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT rt.*, COUNT(r.id) as rank_count
       FROM rank_types rt LEFT JOIN ranks r ON r.type_id=rt.id
       GROUP BY rt.id ORDER BY rt.created_at`
    );
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/', auth, commanderOnly, async (req, res) => {
  try {
    const { name, color } = req.body;
    if (!name) return res.status(400).json({ error: 'يرجى إدخال اسم فئة الرتبة' });
    const { rows } = await db.query(
      'INSERT INTO rank_types (name, color) VALUES ($1, $2) RETURNING *',
      [name, color || '#c9a84c']
    );
    res.status(201).json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.put('/:id', auth, commanderOnly, async (req, res) => {
  try {
    const { name, color } = req.body;
    const { rows } = await db.query(
      'UPDATE rank_types SET name=$1, color=$2 WHERE id=$3 RETURNING *',
      [name, color, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'غير موجود' });
    res.json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.delete('/:id', auth, commanderOnly, async (req, res) => {
  try {
    const { rowCount } = await db.query('DELETE FROM rank_types WHERE id=$1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'غير موجود' });
    res.json({ message: 'تم الحذف بنجاح' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
