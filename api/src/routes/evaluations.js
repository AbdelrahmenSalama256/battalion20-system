const express = require('express');
const db = require('../config/db');
const { auth } = require('../middleware/auth');
const { notifyAllCommanders, notifyAllUsers } = require('../helpers/notification');
const router = express.Router();

// Get evaluations for a soldier
router.get('/soldier/:soldierId', auth, async (req, res) => {
  try {
    const { section_key, specialty_id } = req.query;
    let sql = `
      SELECT e.*, u.name evaluated_by_name, sp.name specialty_name
      FROM evaluations e
      LEFT JOIN users u ON u.id = e.evaluated_by
      LEFT JOIN specialties sp ON sp.id = e.specialty_id
      WHERE e.soldier_id = $1
    `;
    const params = [req.params.soldierId];
    let idx = 2;

    if (section_key) {
      sql += ` AND e.section_key = $${idx}`;
      params.push(section_key);
      idx++;
    }
    if (specialty_id) {
      sql += ` AND e.specialty_id = $${idx}`;
      params.push(specialty_id);
      idx++;
    }

    sql += ' ORDER BY e.created_at DESC';
    const { rows } = await db.query(sql, params);
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Create evaluation
router.post('/', auth, async (req, res) => {
  try {
    const { soldierId, sectionKey, specialtyId, score, maxScore, notes } = req.body;
    if (!soldierId || !sectionKey || score == null) {
      return res.status(400).json({ error: 'يرجى إدخال جميع البيانات المطلوبة' });
    }

    const { rows } = await db.query(
      `INSERT INTO evaluations (soldier_id, section_key, specialty_id, score, max_score, notes, evaluated_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [soldierId, sectionKey, specialtyId || null, score, maxScore || 100, notes || null, req.user.id]
    );

    // Notify commander
    const soldier = await db.query('SELECT name FROM soldiers WHERE id=$1', [soldierId]);
    const evaluator = await db.query('SELECT name FROM users WHERE id=$1', [req.user.id]);
    const sectionNames = { general: 'عام', fitness: 'لياقة', shooting: 'رماية', discipline: 'انضباط', specialties: 'تخصص' };
    const sectionName = sectionNames[sectionKey] || sectionKey;
    const msg = `تم تقييم ${soldier.rows[0]?.name || 'جندي'} في ${sectionName} بدرجة ${score} بواسطة ${evaluator.rows[0]?.name || ''}`;

    await notifyAllCommanders('تقييم جديد', msg, 'evaluation', {
      evaluatorId: req.user.id, evaluatedId: soldierId, sectionKey, score,
    });

    // Notify all users if commander
    if (req.user.role === 'commander') {
      await notifyAllUsers('تقييم جديد', msg, 'evaluation', {
        evaluatorId: req.user.id, evaluatedId: soldierId, sectionKey, score,
      });
    }

    res.status(201).json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Get section stats
router.get('/stats/:sectionKey', auth, async (req, res) => {
  try {
    const { specialtyId } = req.query;
    let sql = `
      SELECT
        e.section_key,
        ROUND(AVG(e.score), 1) as avg_score,
        COUNT(DISTINCT e.soldier_id) as total_soldiers,
        COUNT(e.id) as total_evals,
        MAX(e.score) as max_score,
        MIN(e.score) as min_score
      FROM evaluations e
      WHERE e.section_key = $1
    `;
    const params = [req.params.sectionKey];
    let idx = 2;

    if (specialtyId) {
      sql += ` AND e.specialty_id = $${idx}`;
      params.push(specialtyId);
      idx++;
    }

    sql += ' GROUP BY e.section_key';
    const { rows } = await db.query(sql, params);
    res.json(rows[0] || {});
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Get all evaluations (with filters)
router.get('/', auth, async (req, res) => {
  try {
    const { section_key, soldier_id, page = 1, limit = 50 } = req.query;
    let sql = `
      SELECT e.*, u.name evaluated_by_name, s.name soldier_name, sp.name specialty_name
      FROM evaluations e
      LEFT JOIN users u ON u.id = e.evaluated_by
      LEFT JOIN soldiers s ON s.id = e.soldier_id
      LEFT JOIN specialties sp ON sp.id = e.specialty_id
      WHERE 1=1
    `;
    const params = [];
    let idx = 1;

    if (section_key) {
      sql += ` AND e.section_key = $${idx}`;
      params.push(section_key);
      idx++;
    }
    if (soldier_id) {
      sql += ` AND e.soldier_id = $${idx}`;
      params.push(soldier_id);
      idx++;
    }

    sql += ` ORDER BY e.created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`;
    params.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));

    const { rows } = await db.query(sql, params);
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
