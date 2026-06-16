const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const authMidd = require('../middleware/auth');
const router = express.Router();

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'يرجى إدخال اسم المستخدم وكلمة المرور' });
    }
    const { rows } = await db.query(
      `SELECT u.*, r.name rank_name, r.level rank_level
       FROM users u
       LEFT JOIN ranks r ON r.id=u.rank_id
       WHERE u.username=$1 AND u.is_active=true`,
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
      user: {
        id: user.id, name: user.name, username: user.username, role: user.role,
        rank_id: user.rank_id, rank_name: user.rank_name, rank_level: user.rank_level,
        permissions: user.permissions || {},
        is_active: user.is_active,
      }
    });
  } catch (e) {
    res.status(500).json({ error: 'حدث خطأ في الخادم: ' + e.message });
  }
});

router.get('/me', authMidd.auth, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT u.id, u.name, u.username, u.role, u.is_active, u.rank_id, u.permissions,
        u.created_at, r.name rank_name, r.level rank_level
       FROM users u
       LEFT JOIN ranks r ON r.id=u.rank_id
       WHERE u.id=$1`,
      [req.user.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'المستخدم غير موجود' });
    res.json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.patch('/change-password', authMidd.auth, async (req, res) => {
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
