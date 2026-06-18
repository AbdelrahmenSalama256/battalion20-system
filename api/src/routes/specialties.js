const express = require('express');
const db = require('../config/db');
const { auth, commanderOnly } = require('../middleware/auth');
const router = express.Router();

router.get('/', auth, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT s.*,
        (SELECT COUNT(*) FROM soldier_specialties ss WHERE ss.specialty_id = s.id) as soldier_count
       FROM specialties s
       WHERE s.is_active = true
       ORDER BY s.name`
    );
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT s.*,
        (SELECT COUNT(*) FROM soldier_specialties ss WHERE ss.specialty_id = s.id) as soldier_count
       FROM specialties s WHERE s.id = $1`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'التخصص غير موجود' });

    // Get soldiers in this specialty with their evaluations
    const soldiers = await db.query(
      `SELECT s.*, r.name rank_name, r.level rank_level,
        ss.assigned_at,
        (SELECT ROUND(AVG(e.score), 1) FROM evaluations e
         WHERE e.soldier_id = s.id AND e.specialty_id = $1) as avg_score,
        (SELECT COUNT(*) FROM evaluations e
         WHERE e.soldier_id = s.id AND e.specialty_id = $1) as eval_count
       FROM soldiers s
       JOIN soldier_specialties ss ON ss.soldier_id = s.id
       LEFT JOIN ranks r ON r.id = s.rank_id
       WHERE ss.specialty_id = $1
       ORDER BY r.level DESC, s.name`,
      [req.params.id]
    );

    // Get overall stats
    const stats = await db.query(
      `SELECT
        ROUND(AVG(e.score), 1) as avg_score,
        COUNT(DISTINCT ss.soldier_id) as total_soldiers,
        COUNT(e.id) as total_evals
       FROM soldier_specialties ss
       LEFT JOIN evaluations e ON e.soldier_id = ss.soldier_id AND e.specialty_id = $1
       WHERE ss.specialty_id = $1`,
      [req.params.id]
    );

    res.json({
      ...rows[0],
      soldiers: soldiers.rows,
      stats: stats.rows[0]
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/', auth, commanderOnly, async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ error: 'يرجى إدخال اسم التخصص' });

    const { rows } = await db.query(
      'INSERT INTO specialties (name, description) VALUES ($1, $2) RETURNING *',
      [name, description || null]
    );
    res.status(201).json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.put('/:id', auth, commanderOnly, async (req, res) => {
  try {
    const { name, description, is_active } = req.body;
    const { rows } = await db.query(
      'UPDATE specialties SET name=$1, description=$2, is_active=$3 WHERE id=$4 RETURNING *',
      [name, description || null, is_active !== false, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'التخصص غير موجود' });
    res.json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.delete('/:id', auth, commanderOnly, async (req, res) => {
  try {
    await db.query('UPDATE specialties SET is_active = false WHERE id = $1', [req.params.id]);
    res.json({ message: 'تم الحذف بنجاح' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
