const express = require('express');
const db = require('../config/db');
const pool = require('../config/db').pool;
const { auth, commanderOnly } = require('../middleware/auth');
const router = express.Router();

router.get('/exercises', auth, async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM fitness_exercises ORDER BY name');
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/exercises', auth, commanderOnly, async (req, res) => {
  try {
    const { name, unit, higherIsBetter, passMark } = req.body;
    if (!name) return res.status(400).json({ error: 'يرجى إدخال اسم التمرين' });
    const { rows } = await db.query(
      'INSERT INTO fitness_exercises (name, unit, higher_is_better, pass_mark) VALUES ($1,$2,$3,$4) RETURNING *',
      [name, unit || null, higherIsBetter !== false, passMark || 60]
    );
    res.status(201).json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.put('/exercises/:id', auth, commanderOnly, async (req, res) => {
  try {
    const { name, unit, higherIsBetter, passMark } = req.body;
    const { rows } = await db.query(
      'UPDATE fitness_exercises SET name=$1, unit=$2, higher_is_better=$3, pass_mark=$4 WHERE id=$5 RETURNING *',
      [name, unit, higherIsBetter, passMark, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'غير موجود' });
    res.json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.delete('/exercises/:id', auth, commanderOnly, async (req, res) => {
  try {
    const { rowCount } = await db.query('DELETE FROM fitness_exercises WHERE id=$1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'غير موجود' });
    res.json({ message: 'تم الحذف بنجاح' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/results', auth, async (req, res) => {
  try {
    const { soldierId, results, notes, examDate } = req.body;
    if (!soldierId || !results?.length) {
      return res.status(400).json({ error: 'يرجى إدخال البيانات المطلوبة' });
    }
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      let totalPercent = 0;
      const fitnessRows = [];
      for (const r of results) {
        const ex = await client.query('SELECT * FROM fitness_exercises WHERE id=$1', [r.exerciseId]);
        if (!ex.rows.length) continue;
        const e = ex.rows[0];
        const value = parseFloat(r.value);
        let pct;
        if (e.higher_is_better) {
          pct = Math.min((value / e.pass_mark) * 100, 100);
        } else {
          pct = Math.min((e.pass_mark / Math.max(value, 1)) * 100, 100);
        }
        pct = Math.round(pct * 100) / 100;
        totalPercent += pct;
        fitnessRows.push({ exerciseId: e.id, value, pct, name: e.name });
      }
      const avgScore = results.length > 0 ? Math.round((totalPercent / results.length) * 100) / 100 : 0;
      const result = await client.query(
        `INSERT INTO results (soldier_id, result_type, total_score, notes, exam_date, entered_by)
         VALUES ($1,'fitness',$2,$3,$4,$5) RETURNING *`,
        [soldierId, avgScore, notes || null, examDate || new Date().toISOString().split('T')[0], req.user.id]
      );
      for (const fr of fitnessRows) {
        await client.query(
          'INSERT INTO fitness_results (soldier_id, exercise_id, score_value, score_percent, result_id) VALUES ($1,$2,$3,$4,$5)',
          [soldierId, fr.exerciseId, fr.value, fr.pct, result.rows[0].id]
        );
      }
      await client.query('COMMIT');
      res.status(201).json({
        ...result.rows[0],
        fitnessDetails: fitnessRows
      });
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/results', auth, async (req, res) => {
  try {
    const { soldierId, page = 1, limit = 30 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const { rows } = await db.query(`
      SELECT fr.*, fe.name exercise_name, fe.unit,
        s.name soldier_name, s.military_id,
        r.total_score, r.exam_date
      FROM fitness_results fr
      JOIN fitness_exercises fe ON fe.id=fr.exercise_id
      JOIN soldiers s ON s.id=fr.soldier_id
      JOIN results r ON r.id=fr.result_id
      WHERE ($1::uuid IS NULL OR fr.soldier_id=$1::uuid)
      ORDER BY fr.created_at DESC
      LIMIT $2 OFFSET $3
    `, [soldierId || null, parseInt(limit), offset]);
    res.json({ results: rows, page: parseInt(page), limit: parseInt(limit) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
