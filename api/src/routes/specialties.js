const express = require('express');
const db = require('../config/db');
const { auth, commanderOnly } = require('../middleware/auth');
const router = express.Router();

router.get('/', auth, async (req, res) => {
  try {
    let query = `SELECT s.*, w.name as weapon_name, w.icon as weapon_icon
                 FROM specialties s JOIN weapons w ON w.id=s.weapon_id`;
    const params = [];
    if (req.query.weaponId) {
      query += ' WHERE s.weapon_id=$1';
      params.push(req.query.weaponId);
    }
    query += ' ORDER BY s.name';
    const { rows } = await db.query(query, params);
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/', auth, commanderOnly, async (req, res) => {
  try {
    const { weaponId, name } = req.body;
    if (!weaponId || !name) return res.status(400).json({ error: 'يرجى إدخال البيانات المطلوبة' });
    const { rows } = await db.query(
      'INSERT INTO specialties (weapon_id, name) VALUES ($1, $2) RETURNING *',
      [weaponId, name]
    );
    res.status(201).json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.put('/:id', auth, commanderOnly, async (req, res) => {
  try {
    const { weaponId, name } = req.body;
    const { rows } = await db.query(
      'UPDATE specialties SET weapon_id=$1, name=$2 WHERE id=$3 RETURNING *',
      [weaponId, name, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'غير موجود' });
    res.json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.delete('/:id', auth, commanderOnly, async (req, res) => {
  try {
    const { rowCount } = await db.query('DELETE FROM specialties WHERE id=$1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'غير موجود' });
    res.json({ message: 'تم الحذف بنجاح' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
