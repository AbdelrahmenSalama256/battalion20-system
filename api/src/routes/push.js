const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { auth } = require('../middleware/auth');

// POST /api/push/subscribe — save push subscription
router.post('/subscribe', auth, async (req, res) => {
  try {
    const { endpoint, keys, userAgent } = req.body;
    if (!endpoint || !keys || !keys.p256dh || !keys.auth) {
      return res.status(400).json({ error: 'Missing subscription data' });
    }
    // Upsert: delete old subscription for same endpoint, then insert
    await db.query('DELETE FROM push_subscriptions WHERE endpoint = $1', [endpoint]);
    await db.query(
      `INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth, user_agent)
       VALUES ($1, $2, $3, $4, $5)`,
      [req.user.id, endpoint, keys.p256dh, keys.auth, userAgent || null]
    );
    res.json({ message: 'ok' });
  } catch (e) {
    console.error('Push subscribe error:', e);
    res.status(500).json({ error: 'Internal error' });
  }
});

// DELETE /api/push/unsubscribe — remove push subscription
router.post('/unsubscribe', auth, async (req, res) => {
  try {
    const { endpoint } = req.body;
    if (endpoint) {
      await db.query('DELETE FROM push_subscriptions WHERE endpoint = $1', [endpoint]);
    }
    res.json({ message: 'ok' });
  } catch (e) {
    res.status(500).json({ error: 'Internal error' });
  }
});

module.exports = router;
