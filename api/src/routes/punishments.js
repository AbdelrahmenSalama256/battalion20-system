const express = require('express');
const db = require('../config/db');
const { auth } = require('../middleware/auth');
const { notifyAllCommanders, notifyAllUsers } = require('../helpers/notification');
const router = express.Router();

// Get punishments for a soldier
router.get('/soldier/:soldierId', auth, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT p.*, u.name given_by_name, sp.name specialty_name
       FROM punishments p
       LEFT JOIN users u ON u.id = p.given_by
       LEFT JOIN specialties sp ON sp.id = p.specialty_id
       WHERE p.soldier_id = $1
       ORDER BY p.created_at DESC`,
      [req.params.soldierId]
    );
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Create punishment
router.post('/', auth, async (req, res) => {
  try {
    const { soldierId, sectionKey, specialtyId, reason, color } = req.body;
    if (!soldierId || !sectionKey || !reason) {
      return res.status(400).json({ error: 'يرجى إدخال جميع البيانات المطلوبة' });
    }

    const { rows } = await db.query(
      `INSERT INTO punishments (soldier_id, section_key, specialty_id, reason, color, given_by)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [soldierId, sectionKey, specialtyId || null, reason, color || 'red', req.user.id]
    );

    // Notify commanders
    const soldier = await db.query('SELECT name FROM soldiers WHERE id=$1', [soldierId]);
    const giver = await db.query('SELECT name FROM users WHERE id=$1', [req.user.id]);
    const msg = `تم توقيع جزاء على ${soldier.rows[0]?.name || 'جندي'}: ${reason} بواسطة ${giver.rows[0]?.name || ''}`;

    await notifyAllCommanders('جزاء جديد', msg, 'punishment',
      { evaluatedId: soldierId, givenBy: req.user.id, reason, color: color || 'red' }
    );

    // Notify all users if commander
    if (req.user.role === 'commander') {
      await notifyAllUsers('جزاء جديد', msg, 'punishment',
        { evaluatedId: soldierId, givenBy: req.user.id, reason, color: color || 'red' }
      );
    }

    res.status(201).json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Delete punishment
router.delete('/:id', auth, async (req, res) => {
  try {
    const { rowCount } = await db.query('DELETE FROM punishments WHERE id=$1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'الجزاء غير موجود' });
    res.json({ message: 'تم الحذف بنجاح' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
