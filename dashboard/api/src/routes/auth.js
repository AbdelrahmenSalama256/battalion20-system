const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const authMidd = require('../middleware/auth');
const auth = authMidd.auth;
const router = express.Router();

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'يرجى إدخال اسم المستخدم وكلمة المرور' });
    }
    const { rows } = await db.query(
      'SELECT * FROM users WHERE username=$1 AND is_active=true',
      [username]
    );
    if (!rows.length) {
      return res.status(401).json({ error: 'اسم مستخدم أو كلمة مرور غير صحيحة' });
    }
    const user = rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'اسم مستخدم أو كلمة مرور غير صحيحة' });
    }
    const token = jwt.sign(
      { id: user.id, name: user.name, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );
    res.json({
      token,
      user: { id: user.id, name: user.name, username: user.username, role: user.role }
    });
  } catch (e) {
    console.error('Login error:', e.message, e.stack);
    res.status(500).json({ error: 'DB: ' + e.message });
  }
});

router.get('/me', auth, async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT id, name, username, role, is_active, created_at FROM users WHERE id=$1',
      [req.user.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'المستخدم غير موجود' });
    res.json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.patch('/change-password', auth, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const { rows } = await db.query('SELECT password_hash FROM users WHERE id=$1', [req.user.id]);
    const valid = await bcrypt.compare(oldPassword, rows[0].password_hash);
    if (!valid) return res.status(400).json({ error: 'كلمة المرور القديمة غير صحيحة' });
    const hash = await bcrypt.hash(newPassword, 10);
    await db.query('UPDATE users SET password_hash=$1 WHERE id=$2', [hash, req.user.id]);
    res.json({ message: 'تم تغيير كلمة المرور بنجاح' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
