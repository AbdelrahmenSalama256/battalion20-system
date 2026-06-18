const express = require('express');
const db = require('../config/db');
const { auth } = require('../middleware/auth');
const { notifyAllCommanders, notifyAllUsers } = require('../helpers/notification');
const router = express.Router();

// Get distinctions for a soldier
router.get('/soldier/:soldierId', auth, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT d.*, u.name given_by_name, sp.name specialty_name
       FROM distinctions d
       LEFT JOIN users u ON u.id = d.given_by
       LEFT JOIN specialties sp ON sp.id = d.specialty_id
       WHERE d.soldier_id = $1
       ORDER BY d.created_at DESC`,
      [req.params.soldierId]
    );
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Create distinction
router.post('/', auth, async (req, res) => {
  try {
    const { soldierId, sectionKey, specialtyId, reason, color } = req.body;
    if (!soldierId || !sectionKey || !reason) {
      return res.status(400).json({ error: 'يرجى إدخال جميع البيانات المطلوبة' });
    }

    const { rows } = await db.query(
      `INSERT INTO distinctions (soldier_id, section_key, specialty_id, reason, color, given_by)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [soldierId, sectionKey, specialtyId || null, reason, color || 'gold', req.user.id]
    );

    // Notify commanders
    const soldier = await db.query('SELECT name FROM soldiers WHERE id=$1', [soldierId]);
    const giver = await db.query('SELECT name FROM users WHERE id=$1', [req.user.id]);
    const msg = `تم تمييز ${soldier.rows[0]?.name || 'جندي'}: ${reason} بواسطة ${giver.rows[0]?.name || ''}`;

    await notifyAllCommanders(
      'تمييز جديد', msg, 'distinction',
      { evaluatedId: soldierId, givenBy: req.user.id, reason, color: color || 'gold' }
    );

    // Notify all users if commander gave it
    if (req.user.role === 'commander') {
      await notifyAllUsers('تمييز جديد', msg, 'distinction',
        { evaluatedId: soldierId, givenBy: req.user.id, reason, color: color || 'gold' }
      );
    }

    res.status(201).json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Delete distinction
router.delete('/:id', auth, async (req, res) => {
  try {
    const { rowCount } = await db.query('DELETE FROM distinctions WHERE id=$1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'التمييز غير موجود' });
    res.json({ message: 'تم الحذف بنجاح' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Confirm a distinction (agreement system)
router.post('/:id/confirm', auth, async (req, res) => {
  try {
    // Check distinction exists
    const dist = await db.query('SELECT * FROM distinctions WHERE id=$1', [req.params.id]);
    if (!dist.rows.length) return res.status(404).json({ error: 'التمييز غير موجود' });

    // Check if already confirmed by this user
    const existing = await db.query(
      'SELECT id FROM distinction_confirmations WHERE distinction_id=$1 AND user_id=$2',
      [req.params.id, req.user.id]
    );
    if (existing.rows.length) return res.status(400).json({ error: 'لقد أضفت تأكيدك مسبقاً' });

    await db.query(
      'INSERT INTO distinction_confirmations (distinction_id, user_id) VALUES ($1, $2)',
      [req.params.id, req.user.id]
    );

    // Update confirmation count and auto-confirm if >= 2 confirmations
    const { rows: [{ count }] } = await db.query(
      'SELECT COUNT(*)::int as count FROM distinction_confirmations WHERE distinction_id=$1',
      [req.params.id]
    );
    const isConfirmed = count >= 2;

    await db.query(
      'UPDATE distinctions SET confirmation_count=$1, is_confirmed=$2 WHERE id=$3',
      [count, isConfirmed, req.params.id]
    );

    res.json({ message: 'تم تأكيد التمييز', confirmationCount: count, isConfirmed });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Get confirmations for a distinction
router.get('/:id/confirmations', auth, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT dc.*, u.name user_name
       FROM distinction_confirmations dc
       LEFT JOIN users u ON u.id = dc.user_id
       WHERE dc.distinction_id = $1
       ORDER BY dc.confirmed_at`,
      [req.params.id]
    );
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
