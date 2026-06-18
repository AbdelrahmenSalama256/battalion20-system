const webpush = require('web-push');
const db = require('../config/db');

const vapidPublic = process.env.VAPID_PUBLIC_KEY;
const vapidPrivate = process.env.VAPID_PRIVATE_KEY;
const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:commander@battalion20.local';

if (vapidPublic && vapidPrivate) {
  webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate);
}

async function sendPushToUser(userId, title, body, tag) {
  if (!vapidPublic || !vapidPrivate) return;
  try {
    const result = await db.query(
      'SELECT endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = $1',
      [userId]
    );
    for (const row of result.rows) {
      const sub = {
        endpoint: row.endpoint,
        keys: { p256dh: row.p256dh, auth: row.auth },
      };
      const payload = JSON.stringify({ title, body, tag, icon: 'https://localhost:5173/favicon.ico' });
      webpush.sendNotification(sub, payload).catch(err => {
        // 410 Gone = subscription expired, remove it
        if (err.statusCode === 410) {
          db.query('DELETE FROM push_subscriptions WHERE endpoint = $1', [row.endpoint]).catch(() => {});
        }
      });
    }
  } catch (e) {
    console.error('sendPushToUser error:', e.message);
  }
}

async function sendPushToAllUsers(title, body, tag) {
  if (!vapidPublic || !vapidPrivate) return;
  try {
    const result = await db.query('SELECT DISTINCT user_id FROM push_subscriptions');
    for (const row of result.rows) {
      await sendPushToUser(row.user_id, title, body, tag);
    }
  } catch (e) {
    console.error('sendPushToAllUsers error:', e.message);
  }
}

module.exports = { sendPushToUser, sendPushToAllUsers };
