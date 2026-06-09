const express = require('express');
const db = require('../config/db');
const { auth, commanderOnly } = require('../middleware/auth');
const router = express.Router();

router.get('/', auth, async (req, res) => {
  try {
    const { search, weaponId, specialtyId } = req.query;
    let sql = `
      SELECT s.*,
        r.name rank_name, rt.name rank_type_name, rt.color rank_type_color,
        w.name weapon_name, w.icon weapon_icon, w.color weapon_color,
        sp.name specialty_name
      FROM soldiers s
      LEFT JOIN ranks r ON r.id=s.rank_id
      LEFT JOIN rank_types rt ON rt.id=r.type_id
      LEFT JOIN weapons w ON w.id=s.weapon_id
      LEFT JOIN specialties sp ON sp.id=s.specialty_id
      WHERE ($1::text IS NULL OR s.name ILIKE '%'||$1||'%' OR s.military_id ILIKE '%'||$1||'%')
      AND ($2::uuid IS NULL OR s.weapon_id=$2::uuid)
    `;
    const params = [search || null, weaponId || null];
    if (specialtyId) {
      sql += ' AND s.specialty_id=$3::uuid';
      params.push(specialtyId);
    }
    sql += ' ORDER BY s.created_at DESC';
    const { rows } = await db.query(sql, params);
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const soldier = await db.query(
      `SELECT s.*,
        r.name rank_name, rt.name rank_type_name, rt.color rank_type_color,
        w.name weapon_name, w.icon weapon_icon, w.color weapon_color,
        sp.name specialty_name
      FROM soldiers s
      LEFT JOIN ranks r ON r.id=s.rank_id
      LEFT JOIN rank_types rt ON rt.id=r.type_id
      LEFT JOIN weapons w ON w.id=s.weapon_id
      LEFT JOIN specialties sp ON sp.id=s.specialty_id
      WHERE s.id=$1`,
      [req.params.id]
    );
    if (!soldier.rows.length) return res.status(404).json({ error: 'الجندي غير موجود' });
    const results = await db.query(
      `SELECT r.*, e.title as exam_title, e.type as exam_type
       FROM results r LEFT JOIN exams e ON e.id=r.exam_id
       WHERE r.soldier_id=$1 ORDER BY r.created_at DESC LIMIT 10`,
      [req.params.id]
    );
    res.json({ ...soldier.rows[0], results: results.rows });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { name, militaryId, rankId, weaponId, specialtyId, notes } = req.body;
    if (!name) return res.status(400).json({ error: 'يرجى إدخال اسم الجندي' });
    const { rows } = await db.query(
      `INSERT INTO soldiers (name, military_id, rank_id, weapon_id, specialty_id, notes)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [name, militaryId || null, rankId || null, weaponId || null, specialtyId || null, notes || null]
    );
    res.status(201).json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const { name, militaryId, rankId, weaponId, specialtyId, notes } = req.body;
    const { rows } = await db.query(
      `UPDATE soldiers SET name=$1, military_id=$2, rank_id=$3, weapon_id=$4,
       specialty_id=$5, notes=$6 WHERE id=$7 RETURNING *`,
      [name, militaryId, rankId, weaponId, specialtyId, notes, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'الجندي غير موجود' });
    res.json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.delete('/:id', auth, commanderOnly, async (req, res) => {
  try {
    const { rowCount } = await db.query('DELETE FROM soldiers WHERE id=$1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'الجندي غير موجود' });
    res.json({ message: 'تم الحذف بنجاح' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
