const express = require('express');
const db = require('../config/db');
const { auth, commanderOnly } = require('../middleware/auth');
const { rankCheck } = require('../middleware/rankCheck');
const { notifyAllCommanders } = require('../helpers/notification');
const router = express.Router();

router.get('/', auth, async (req, res) => {
  try {
    const { search, weaponId, specialtyId, maxRankLevel } = req.query;
    let sql = `
      SELECT s.*,
        r.name rank_name, r.level rank_level, rt.name rank_type_name, rt.color rank_type_color,
        w.name weapon_name, w.icon weapon_icon, w.color weapon_color,
        sp.name specialty_name
      FROM soldiers s
      LEFT JOIN ranks r ON r.id=s.rank_id
      LEFT JOIN rank_types rt ON rt.id=r.type_id
      LEFT JOIN weapons w ON w.id=s.weapon_id
      LEFT JOIN specialties sp ON sp.id=s.specialty_id
      WHERE 1=1
    `;
    const params = [];
    let idx = 1;
    if (search) {
      sql += ` AND (s.name ILIKE '%'||$${idx}||'%' OR s.military_id ILIKE '%'||$${idx}||'%')`;
      params.push(search);
      idx++;
    }
    if (weaponId) {
      sql += ` AND s.weapon_id=$${idx}::uuid`;
      params.push(weaponId);
      idx++;
    }
    if (specialtyId) {
      sql += ` AND s.specialty_id=$${idx}::uuid`;
      params.push(specialtyId);
      idx++;
    }
    if (maxRankLevel) {
      sql += ` AND (r.level IS NULL OR r.level <= $${idx}::int)`;
      params.push(parseInt(maxRankLevel));
      idx++;
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
        r.name rank_name, r.level rank_level, rt.name rank_type_name, rt.color rank_type_color,
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

router.post('/:id/evaluate', auth, rankCheck('id', true), async (req, res) => {
  try {
    const { fitnessScore, specialtyScore, disciplineScore, notes } = req.body;
    const soldierId = req.params.id;
    if (fitnessScore == null || specialtyScore == null || disciplineScore == null) {
      return res.status(400).json({ error: 'يرجى إدخال جميع الدرجات' });
    }
    const totalScore = Math.round(((fitnessScore + specialtyScore + disciplineScore) / 300) * 100 * 100) / 100;
    const soldier = await db.query('SELECT name FROM soldiers WHERE id=$1', [soldierId]);
    const result = await db.query(
      `INSERT INTO results (soldier_id, result_type, total_score, notes, entered_by,
        fitness_score, specialty_score, discipline_score)
       VALUES ($1,'evaluation',$2,$3,$4,$5,$6,$7) RETURNING *`,
      [soldierId, totalScore, notes || null, req.user.id, fitnessScore, specialtyScore, disciplineScore]
    );
    const evaluator = await db.query('SELECT name FROM users WHERE id=$1', [req.user.id]);
    await notifyAllCommanders(
      'تقييم جديد',
      `تم تقييم ${soldier.rows[0]?.name || 'جندي'} بـ ${totalScore}% بواسطة ${evaluator.rows[0]?.name || ''}`,
      'evaluation',
      {
        evaluatorId: req.user.id, evaluatorName: evaluator.rows[0]?.name,
        evaluatedId: soldierId, evaluatedName: soldier.rows[0]?.name,
        fitnessScore, specialtyScore, disciplineScore, totalScore,
        relatedResultId: result.rows[0].id,
      }
    );
    res.status(201).json(result.rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/:id/distinguish', auth, async (req, res) => {
  try {
    const { badge, citation } = req.body;
    await db.query(
      `UPDATE soldiers SET distinction_badge=$1, distinction_citation=$2,
       distinguished_by=$3, distinguished_at=NOW()
       WHERE id=$4`,
      [badge, citation, req.user.id, req.params.id]
    );
    res.json({ message: 'تم منح الوسام' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.delete('/:id/distinguish', auth, async (req, res) => {
  try {
    await db.query(
      `UPDATE soldiers SET distinction_badge=NULL, distinction_citation=NULL,
       distinguished_by=NULL, distinguished_at=NULL
       WHERE id=$1`,
      [req.params.id]
    );
    res.json({ message: 'تم إزالة الوسام' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
