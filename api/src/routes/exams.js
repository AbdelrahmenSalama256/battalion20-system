const express = require('express');
const db = require('../config/db');
const pool = require('../config/db').pool;
const { auth, commanderOnly } = require('../middleware/auth');
const router = express.Router();

router.get('/', auth, async (req, res) => {
  try {
    const { type, weaponId } = req.query;
    let sql = `
      SELECT e.*,
        w.name weapon_name, w.icon weapon_icon,
        sp.name specialty_name,
        COUNT(DISTINCT ei.id)::int item_count,
        COUNT(DISTINCT r.id)::int result_count,
        ROUND(AVG(r.total_score),1) avg_score
      FROM exams e
      LEFT JOIN weapons w ON w.id=e.weapon_id
      LEFT JOIN specialties sp ON sp.id=e.specialty_id
      LEFT JOIN exam_items ei ON ei.exam_id=e.id
      LEFT JOIN results r ON r.exam_id=e.id
      WHERE ($1::text IS NULL OR e.type=$1::text)
      AND ($2::uuid IS NULL OR e.weapon_id=$2::uuid)
      GROUP BY e.id,w.name,w.icon,sp.name
      ORDER BY e.created_at DESC
    `;
    const { rows } = await db.query(sql, [type || null, weaponId || null]);
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const exam = await db.query(
      `SELECT e.*,
        w.name weapon_name, w.icon weapon_icon, w.color weapon_color,
        sp.name specialty_name
      FROM exams e
      LEFT JOIN weapons w ON w.id=e.weapon_id
      LEFT JOIN specialties sp ON sp.id=e.specialty_id
      WHERE e.id=$1`,
      [req.params.id]
    );
    if (!exam.rows.length) return res.status(404).json({ error: 'الامتحان غير موجود' });
    const items = await db.query(
      'SELECT * FROM exam_items WHERE exam_id=$1 ORDER BY sort_order',
      [req.params.id]
    );
    res.json({ ...exam.rows[0], items: items.rows });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { title, type, weaponId, specialtyId, items } = req.body;
    if (!title || !items?.length) {
      return res.status(400).json({ error: 'يرجى إدخال عنوان الامتحان وبنوده' });
    }
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const exam = await client.query(
        `INSERT INTO exams (title, type, weapon_id, specialty_id, created_by)
         VALUES ($1,$2,$3,$4,$5) RETURNING *`,
        [title, type || 'general', weaponId || null, specialtyId || null, req.user.id]
      );
      for (let i = 0; i < items.length; i++) {
        await client.query(
          'INSERT INTO exam_items (exam_id, text, max_score, sort_order) VALUES ($1,$2,$3,$4)',
          [exam.rows[0].id, items[i].text, items[i].maxScore || 10, i]
        );
      }
      await client.query('COMMIT');
      res.status(201).json(exam.rows[0]);
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

router.put('/:id', auth, async (req, res) => {
  try {
    const { title, type, weaponId, specialtyId, items } = req.body;
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const exam = await client.query(
        `UPDATE exams SET title=$1, type=$2, weapon_id=$3, specialty_id=$4
         WHERE id=$5 RETURNING *`,
        [title, type, weaponId || null, specialtyId || null, req.params.id]
      );
      if (!exam.rows.length) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'الامتحان غير موجود' });
      }
      await client.query('DELETE FROM exam_items WHERE exam_id=$1', [req.params.id]);
      for (let i = 0; i < items.length; i++) {
        await client.query(
          'INSERT INTO exam_items (exam_id, text, max_score, sort_order) VALUES ($1,$2,$3,$4)',
          [req.params.id, items[i].text, items[i].maxScore || 10, i]
        );
      }
      await client.query('COMMIT');
      const full = await db.query(
        'SELECT * FROM exam_items WHERE exam_id=$1 ORDER BY sort_order',
        [req.params.id]
      );
      res.json({ ...exam.rows[0], items: full.rows });
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

router.delete('/:id', auth, commanderOnly, async (req, res) => {
  try {
    const { rowCount } = await db.query('DELETE FROM exams WHERE id=$1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'الامتحان غير موجود' });
    res.json({ message: 'تم الحذف بنجاح' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
