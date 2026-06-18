const express = require('express');
const db = require('../config/db');
const { auth, commanderOnly } = require('../middleware/auth');
const { notifyAllUsers, notifyAllCommanders } = require('../helpers/notification');
const router = express.Router();

router.get('/', auth, async (req, res) => {
  try {
    const { sectionKey } = req.query;
    let sql = `
      SELECT e.*, u.name created_by_name,
        sp.name specialty_name
      FROM exams e
      LEFT JOIN users u ON u.id = e.created_by
      LEFT JOIN specialties sp ON sp.id = e.specialty_id
      WHERE e.is_active = true
    `;
    const params = [];
    let idx = 1;
    if (sectionKey) {
      sql += ` AND e.section_key = $${idx}`;
      params.push(sectionKey);
      idx++;
    }
    sql += ' ORDER BY e.created_at DESC';
    const { rows } = await db.query(sql, params);
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT e.*, u.name created_by_name, sp.name specialty_name
       FROM exams e
       LEFT JOIN users u ON u.id = e.created_by
       LEFT JOIN specialties sp ON sp.id = e.specialty_id
       WHERE e.id = $1`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'الامتحان غير موجود' });
    res.json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/', auth, commanderOnly, async (req, res) => {
  try {
    const { title, sectionKey, specialtyId, focusPoints, notes, maxScore } = req.body;
    if (!title || !sectionKey) return res.status(400).json({ error: 'يرجى إدخال جميع البيانات' });

    const { rows } = await db.query(
      `INSERT INTO exams (title, section_key, specialty_id, focus_points, notes, max_score, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [title, sectionKey, specialtyId || null, focusPoints || [], notes || null, maxScore || 100, req.user.id]
    );

    await notifyAllUsers(
      'امتحان جديد',
      `تم إضافة امتحان جديد: ${title}`,
      'exam',
      {}
    );

    res.status(201).json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.put('/:id', auth, commanderOnly, async (req, res) => {
  try {
    const { title, sectionKey, specialtyId, focusPoints, notes, maxScore, isActive } = req.body;
    const { rows } = await db.query(
      `UPDATE exams SET title=$1, section_key=$2, specialty_id=$3,
       focus_points=$4, notes=$5, max_score=$6, is_active=$7
       WHERE id=$8 RETURNING *`,
      [title, sectionKey, specialtyId || null, focusPoints || [], notes || null, maxScore || 100, isActive !== false, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'الامتحان غير موجود' });
    res.json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.delete('/:id', auth, commanderOnly, async (req, res) => {
  try {
    const { rowCount } = await db.query('DELETE FROM exams WHERE id=$1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'الامتحان غير موجود' });
    res.json({ message: 'تم الحذف' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
