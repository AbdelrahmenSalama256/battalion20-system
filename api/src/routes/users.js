const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../config/db');
const { auth, commanderOnly } = require('../middleware/auth');
const router = express.Router();

router.get('/', auth, commanderOnly, async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT id, name, username, role, is_active, created_at FROM users ORDER BY created_at'
    );
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/', auth, commanderOnly, async (req, res) => {
  try {
    const { name, username, password, role } = req.body;
    if (!name || !username || !password) {
      return res.status(400).json({ error: 'يرجى إدخال جميع البيانات' });
    }
    const exists = await db.query('SELECT id FROM users WHERE username=$1', [username]);
    if (exists.rows.length) return res.status(400).json({ error: 'اسم المستخدم موجود بالفعل' });
    const hash = await bcrypt.hash(password, 10);
    const { rows } = await db.query(
      'INSERT INTO users (name, username, password_hash, role) VALUES ($1,$2,$3,$4) RETURNING id, name, username, role, is_active, created_at',
      [name, username, hash, role || 'officer']
    );
    res.status(201).json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.patch('/:id/password', auth, commanderOnly, async (req, res) => {
  try {
    const { password } = req.body;
    if (!password) return res.status(400).json({ error: 'يرجى إدخال كلمة المرور الجديدة' });
    const hash = await bcrypt.hash(password, 10);
    await db.query('UPDATE users SET password_hash=$1 WHERE id=$2', [hash, req.params.id]);
    res.json({ message: 'تم تغيير كلمة المرور بنجاح' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.patch('/:id/toggle', auth, commanderOnly, async (req, res) => {
  try {
    if (req.params.id === req.user.id) {
      return res.status(400).json({ error: 'لا يمكنك تعطيل حسابك الخاص' });
    }
    const { rows } = await db.query(
      'UPDATE users SET is_active = NOT is_active WHERE id=$1 RETURNING id, is_active',
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'المستخدم غير موجود' });
    res.json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.delete('/:id', auth, commanderOnly, async (req, res) => {
  try {
    if (req.params.id === req.user.id) {
      return res.status(400).json({ error: 'لا يمكنك حذف حسابك' });
    }
    const { rowCount } = await db.query('DELETE FROM users WHERE id=$1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'المستخدم غير موجود' });
    res.json({ message: 'تم الحذف بنجاح' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
