const express = require('express');
const db = require('../config/db');
const pool = require('../config/db').pool;
const { auth, commanderOnly } = require('../middleware/auth');
const { rankCheck } = require('../middleware/rankCheck');
const { notifyUser, notifyAllCommanders } = require('../helpers/notification');
const router = express.Router();

router.get('/', auth, async (req, res) => {
  try {
    const { type, weaponId, soldierId, page = 1, limit = 30 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    let sql = `
      SELECT r.*, s.name soldier_name, s.military_id,
        e.title exam_title, e.type exam_type,
        u.name entered_by_name,
        COUNT(*) OVER() as total_count
      FROM results r
      JOIN soldiers s ON s.id=r.soldier_id
      LEFT JOIN exams e ON e.id=r.exam_id
      LEFT JOIN users u ON u.id=r.entered_by
      WHERE ($1::text IS NULL OR r.result_type=$1::text)
      AND ($2::uuid IS NULL OR s.weapon_id=$2::uuid)
      AND ($3::uuid IS NULL OR r.soldier_id=$3::uuid)
      ORDER BY r.created_at DESC
      LIMIT $4 OFFSET $5
    `;
    const { rows } = await db.query(sql, [
      type || null, weaponId || null, soldierId || null,
      parseInt(limit), offset
    ]);
    const total = rows.length ? parseInt(rows[0].total_count) : 0;
    res.json({ results: rows, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/stats', auth, async (req, res) => {
  try {
    const counts = await db.query(`
      SELECT
        (SELECT COUNT(*) FROM soldiers) total_soldiers,
        (SELECT COUNT(*) FROM results) total_results,
        COALESCE(ROUND((SELECT AVG(total_score) FROM results), 1), 0) avg_score,
        COALESCE(ROUND(
          (SELECT COUNT(*) FROM results WHERE total_score >= 50) * 100.0 /
          NULLIF((SELECT COUNT(*) FROM results), 0), 1
        ), 0) pass_rate
    `);
    const byWeapon = await db.query(`
      SELECT w.name weapon_name, w.icon weapon_icon,
        COUNT(r.id)::int count,
        ROUND(AVG(r.total_score), 1) avg,
        COALESCE(ROUND(
          COUNT(CASE WHEN r.total_score >= 50 THEN 1 END) * 100.0 /
          NULLIF(COUNT(r.id), 0), 1
        ), 0) pass_rate
      FROM weapons w
      LEFT JOIN soldiers s ON s.weapon_id=w.id
      LEFT JOIN results r ON r.soldier_id=s.id
      GROUP BY w.id,w.name,w.icon
      ORDER BY count DESC
    `);
    const distribution = await db.query(`
      SELECT
        COUNT(CASE WHEN total_score >= 90 THEN 1 END)::int excellent,
        COUNT(CASE WHEN total_score >= 75 AND total_score < 90 THEN 1 END)::int very_good,
        COUNT(CASE WHEN total_score >= 65 AND total_score < 75 THEN 1 END)::int good,
        COUNT(CASE WHEN total_score >= 50 AND total_score < 65 THEN 1 END)::int acceptable,
        COUNT(CASE WHEN total_score < 50 THEN 1 END)::int fail
      FROM results
    `);
    const recent = await db.query(`
      SELECT r.*, s.name soldier_name, s.military_id,
        e.title exam_title
      FROM results r
      JOIN soldiers s ON s.id=r.soldier_id
      LEFT JOIN exams e ON e.id=r.exam_id
      ORDER BY r.created_at DESC LIMIT 8
    `);
    res.json({
      ...counts.rows[0],
      byWeapon: byWeapon.rows,
      distribution: distribution.rows[0],
      recentResults: recent.rows
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT r.*, s.name soldier_name, s.military_id,
        e.title exam_title, e.type exam_type,
        u.name entered_by_name
      FROM results r
      JOIN soldiers s ON s.id=r.soldier_id
      LEFT JOIN exams e ON e.id=r.exam_id
      LEFT JOIN users u ON u.id=r.entered_by
      WHERE r.id=$1
    `, [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ error: 'النتيجة غير موجودة' });
    const scores = await db.query(`
      SELECT ris.*, ei.text item_text, ei.max_score
      FROM result_item_scores ris
      LEFT JOIN exam_items ei ON ei.id=ris.item_id
      WHERE ris.result_id=$1
    `, [req.params.id]);
    res.json({ ...result.rows[0], scores: scores.rows });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/', auth, rankCheck('soldierId'), async (req, res) => {
  try {
    const { examId, soldierId, scores, notes, resultType, examDate, isImportant, flag } = req.body;
    if (!examId || !soldierId || !scores?.length) {
      return res.status(400).json({ error: 'يرجى إدخال البيانات المطلوبة' });
    }
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const items = await client.query(
        'SELECT id, max_score FROM exam_items WHERE exam_id=$1 ORDER BY sort_order',
        [examId]
      );
      if (!items.rows.length) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'الامتحان لا يحتوي على بنود' });
      }
      let totalGot = 0, totalMax = 0;
      for (const item of items.rows) {
        const score = scores.find(s => s.itemId === item.id);
        const val = score ? parseFloat(score.value) : 0;
        totalGot += val;
        totalMax += parseFloat(item.max_score);
      }
      const totalScore = totalMax > 0 ? Math.round((totalGot / totalMax) * 100 * 100) / 100 : 0;
      const result = await client.query(
        `INSERT INTO results (exam_id, soldier_id, result_type, total_score, notes, exam_date, entered_by, is_important, flag)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
        [examId, soldierId, resultType || 'exam', totalScore, notes || null,
         examDate || new Date().toISOString().split('T')[0], req.user.id,
         isImportant === true, flag || 'normal']
      );
      for (const item of items.rows) {
        const score = scores.find(s => s.itemId === item.id);
        const val = score ? parseFloat(score.value) : 0;
        await client.query(
          'INSERT INTO result_item_scores (result_id, item_id, score_value) VALUES ($1,$2,$3)',
          [result.rows[0].id, item.id, val]
        );
      }
      await client.query('COMMIT');

      const soldier = await db.query('SELECT name FROM soldiers WHERE id=$1', [soldierId]);

      if (isImportant === true) {
        await notifyAllCommanders(
          'ملاحظة مهمة',
          `تم إضافة نتيجة مهمة للجندي ${soldier.rows[0]?.name || ''}`,
          'important_note',
          { evaluatorId: req.user.id, evaluatorName: req.user.name, evaluatedId: soldierId, evaluatedName: soldier.rows[0]?.name, totalScore, relatedResultId: result.rows[0].id }
        );
      }

      if (flag && flag !== 'normal') {
        await notifyAllCommanders(
          'تحديث علم النتيجة',
          `تم تعيين علم "${flag === 'exceptional' ? 'استثنائي' : 'تحذير'}" لنتيجة الجندي ${soldier.rows[0]?.name || ''}`,
          'flag_updated',
          { evaluatorId: req.user.id, evaluatorName: req.user.name, evaluatedId: soldierId, evaluatedName: soldier.rows[0]?.name, totalScore, relatedResultId: result.rows[0].id }
        );
      }

      res.status(201).json({ ...result.rows[0], totalScore });
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
    const { rowCount } = await db.query('DELETE FROM results WHERE id=$1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'النتيجة غير موجودة' });
    res.json({ message: 'تم الحذف بنجاح' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
