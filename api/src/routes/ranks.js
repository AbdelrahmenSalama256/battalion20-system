const express = require('express');
const db = require('../config/db');
const { auth, commanderOnly } = require('../middleware/auth');
const router = express.Router();

router.get('/', auth, async (req, res) => {
  try {
    let query = `SELECT r.*, rt.name as type_name, rt.color as type_color
                 FROM ranks r JOIN rank_types rt ON rt.id=r.type_id`;
    const params = [];
    if (req.query.typeId) {
      query += ' WHERE r.type_id=$1';
      params.push(req.query.typeId);
    }
    query += ' ORDER BY r.sort_order';
    const { rows } = await db.query(query, params);
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/', auth, commanderOnly, async (req, res) => {
  try {
    const { typeId, name, sortOrder } = req.body;
    if (!typeId || !name) return res.status(400).json({ error: 'يرجى إدخال البيانات المطلوبة' });
    const { rows } = await db.query(
      'INSERT INTO ranks (type_id, name, sort_order) VALUES ($1, $2, $3) RETURNING *',
      [typeId, name, sortOrder || 0]
    );
    res.status(201).json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.put('/:id', auth, commanderOnly, async (req, res) => {
  try {
    const { typeId, name, sortOrder } = req.body;
    const { rows } = await db.query(
      'UPDATE ranks SET type_id=$1, name=$2, sort_order=$3 WHERE id=$4 RETURNING *',
      [typeId, name, sortOrder, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'غير موجود' });
    res.json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.delete('/:id', auth, commanderOnly, async (req, res) => {
  try {
    const { rowCount } = await db.query('DELETE FROM ranks WHERE id=$1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'غير موجود' });
    res.json({ message: 'تم الحذف بنجاح' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
