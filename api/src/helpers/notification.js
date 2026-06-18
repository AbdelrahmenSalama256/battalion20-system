const db = require('../config/db');
const { emitToUser } = require('../socket');
const { sendPushToUser } = require('./push');

async function notifyUser(userId, title, message, type, data = {}) {
  try {
    const { rows } = await db.query(
      `INSERT INTO notifications (user_id, title, message, type,
        evaluator_id, evaluator_name, evaluated_id, evaluated_name,
        fitness_score, specialty_score, discipline_score, total_score,
        related_result_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       RETURNING *`,
      [
        userId, title, message, type,
        data.evaluatorId || null, data.evaluatorName || null,
        data.evaluatedId || null, data.evaluatedName || null,
        data.fitnessScore || null, data.specialtyScore || null,
        data.disciplineScore || null, data.totalScore || null,
        data.relatedResultId || null,
      ]
    );
    emitToUser(userId, 'notification', rows[0]);
    // Send push notification (works even if dashboard is closed)
    sendPushToUser(userId, title, message, `b20-${type}`);
    return rows[0];
  } catch (e) {
    console.error('notifyUser error:', e.message);
    return null;
  }
}

async function notifyAllCommanders(title, message, type, data = {}) {
  try {
    const { rows } = await db.query(
      "SELECT id FROM users WHERE role='commander' AND is_active=true"
    );
    for (const u of rows) {
      await notifyUser(u.id, title, message, type, data);
    }
  } catch (e) {
    console.error('notifyAllCommanders error:', e.message);
  }
}

async function notifyAllUsers(title, message, type, data = {}) {
  try {
    const { rows } = await db.query(
      'SELECT id FROM users WHERE is_active=true'
    );
    for (const u of rows) {
      await notifyUser(u.id, title, message, type, data);
    }
  } catch (e) {
    console.error('notifyAllUsers error:', e.message);
  }
}

module.exports = { notifyUser, notifyAllCommanders, notifyAllUsers };
