const express = require('express');
const db = require('../config/db');
const { auth, commanderOnly } = require('../middleware/auth');
const { rankCheck } = require('../middleware/rankCheck');
const router = express.Router();

router.get('/', auth, async (req, res) => {
  try {
    const { search, weaponId, specialtyId, status, maxRankLevel } = req.query;
    let sql = `
      SELECT s.*,
        r.name rank_name, r.level rank_level,
        w.name weapon_name, w.icon weapon_icon,
        sp.name specialty_name, sp.id specialty_id,
        (SELECT ROUND(AVG(e.score), 1) FROM evaluations e WHERE e.soldier_id = s.id) as avg_score,
        (SELECT COUNT(*) FROM evaluations e WHERE e.soldier_id = s.id) as eval_count,
        (SELECT COUNT(*) FROM distinctions d WHERE d.soldier_id = s.id) as distinction_count,
        (SELECT COUNT(*) FROM punishments p WHERE p.soldier_id = s.id) as punishment_count
      FROM soldiers s
      LEFT JOIN ranks r ON r.id = s.rank_id
      LEFT JOIN weapons w ON w.id = s.weapon_id
      LEFT JOIN specialties sp ON sp.id = s.specialty_id
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
      sql += ` AND s.weapon_id = $${idx}`;
      params.push(weaponId);
      idx++;
    }
    if (status) {
      sql += ` AND s.status = $${idx}`;
      params.push(status);
      idx++;
    }
    if (maxRankLevel) {
      sql += ` AND (r.level IS NULL OR r.level <= $${idx}::int)`;
      params.push(parseInt(maxRankLevel));
      idx++;
    }
    if (specialtyId) {
      sql += ` AND EXISTS (SELECT 1 FROM soldier_specialties ss WHERE ss.soldier_id = s.id AND ss.specialty_id = $${idx})`;
      params.push(specialtyId);
      idx++;
    }

    sql += ' ORDER BY r.level DESC, s.name';
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
        r.name rank_name, r.level rank_level,
        w.name weapon_name, w.icon weapon_icon
       FROM soldiers s
       LEFT JOIN ranks r ON r.id = s.rank_id
       LEFT JOIN weapons w ON w.id = s.weapon_id
       WHERE s.id = $1`,
      [req.params.id]
    );
    if (!soldier.rows.length) return res.status(404).json({ error: 'الجندي غير موجود' });

    // Get specialties
    const specialties = await db.query(
      `SELECT sp.id, sp.name, sp.description
       FROM specialties sp
       WHERE sp.id = $1`,
      [soldier.rows[0]?.specialty_id || null]
    );

    // Get evaluations
    const evaluations = await db.query(
      `SELECT e.*, u.name evaluated_by_name,
        sp.name specialty_name
       FROM evaluations e
       LEFT JOIN users u ON u.id = e.evaluated_by
       LEFT JOIN specialties sp ON sp.id = e.specialty_id
       WHERE e.soldier_id = $1
       ORDER BY e.created_at DESC`,
      [req.params.id]
    );

    // Get distinctions
    const distinctions = await db.query(
      `SELECT d.*, u.name given_by_name
       FROM distinctions d
       LEFT JOIN users u ON u.id = d.given_by
       WHERE d.soldier_id = $1
       ORDER BY d.created_at DESC`,
      [req.params.id]
    );

    // Get punishments
    const punishments = await db.query(
      `SELECT p.*, u.name given_by_name
       FROM punishments p
       LEFT JOIN users u ON u.id = p.given_by
       WHERE p.soldier_id = $1
       ORDER BY p.created_at DESC`,
      [req.params.id]
    );

    // Get stats per section
    const sectionStats = await db.query(
      `SELECT
        section_key,
        ROUND(AVG(score), 1) as avg_score,
        COUNT(*) as eval_count,
        MAX(score) as max_score,
        MIN(score) as min_score
       FROM evaluations
       WHERE soldier_id = $1
       GROUP BY section_key`,
      [req.params.id]
    );

    res.json({
      ...soldier.rows[0],
      specialties: specialties.rows,
      evaluations: evaluations.rows,
      distinctions: distinctions.rows,
      punishments: punishments.rows,
      sectionStats: sectionStats.rows
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { name, militaryId, rankId, weaponId, specialtyId, status, statusNotes, notes } = req.body;
    if (!name) return res.status(400).json({ error: 'يرجى إدخال اسم الجندي' });

    const { rows } = await db.query(
      `INSERT INTO soldiers (name, military_id, rank_id, weapon_id, specialty_id, status, status_notes, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [name, militaryId || null, rankId || null, weaponId || null, specialtyId || null, status || 'active', statusNotes || null, notes || null]
    );
    res.status(201).json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const { name, militaryId, rankId, weaponId, specialtyId, status, statusNotes, notes } = req.body;
    const { rows } = await db.query(
      `UPDATE soldiers SET name=$1, military_id=$2, rank_id=$3, weapon_id=$4,
       specialty_id=$5, status=$6, status_notes=$7, notes=$8
       WHERE id=$9 RETURNING *`,
      [name, militaryId || null, rankId || null, weaponId || null, specialtyId || null,
       status || 'active', statusNotes || null, notes || null, req.params.id]
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

// Assign specialty to soldier
router.post('/:id/specialties', auth, async (req, res) => {
  try {
    const { specialtyId } = req.body;
    if (!specialtyId) return res.status(400).json({ error: 'يرجى تحديد التخصص' });

    await db.query(
      'INSERT INTO soldier_specialties (soldier_id, specialty_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [req.params.id, specialtyId]
    );
    res.json({ message: 'تم ربط التخصص' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Remove specialty from soldier
router.delete('/:id/specialties/:specId', auth, async (req, res) => {
  try {
    await db.query(
      'DELETE FROM soldier_specialties WHERE soldier_id = $1 AND specialty_id = $2',
      [req.params.id, req.params.specId]
    );
    res.json({ message: 'تم فك الربط' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
