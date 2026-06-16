const express = require('express');
const db = require('../config/db');
const { auth, commanderOnly } = require('../middleware/auth');
const { notifyAllCommanders } = require('../helpers/notification');
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
    if (req.query.levelMin) {
      query += params.length ? ' AND' : ' WHERE';
      query += ` r.level>=$` + (params.length + 1);
      params.push(parseInt(req.query.levelMin));
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
    const { typeId, name, sortOrder, level } = req.body;
    if (!typeId || !name) return res.status(400).json({ error: 'يرجى إدخال البيانات المطلوبة' });
    const { rows } = await db.query(
      'INSERT INTO ranks (type_id, name, sort_order, level) VALUES ($1, $2, $3, $4) RETURNING *',
      [typeId, name, sortOrder || 0, level || sortOrder || 0]
    );
    await notifyAllCommanders(
      'تنبيه النظام',
      `تم إضافة رتبة جديدة: ${name}`,
      'system_alert'
    );
    res.status(201).json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.put('/:id', auth, commanderOnly, async (req, res) => {
  try {
    const { typeId, name, sortOrder, level } = req.body;
    const { rows } = await db.query(
      'UPDATE ranks SET type_id=$1, name=$2, sort_order=$3, level=COALESCE($4, sort_order) WHERE id=$5 RETURNING *',
      [typeId, name, sortOrder, level || null, req.params.id]
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
