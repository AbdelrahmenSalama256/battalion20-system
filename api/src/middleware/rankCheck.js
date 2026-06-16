const db = require('../config/db');

async function getRankLevel(userId) {
  if (!userId) return null;
  const user = await db.query(
    'SELECT role, rank_id FROM users WHERE id=$1', [userId]
  );
  if (!user.rows.length) return null;
  const u = user.rows[0];
  if (u.role === 'commander') return 999;
  if (!u.rank_id) return null;
  const rank = await db.query(
    'SELECT level FROM ranks WHERE id=$1', [u.rank_id]
  );
  return rank.rows.length ? rank.rows[0].level : null;
}

async function getSoldierRankLevel(soldierId) {
  if (!soldierId) return null;
  const soldier = await db.query(
    'SELECT rank_id FROM soldiers WHERE id=$1', [soldierId]
  );
  if (!soldier.rows.length || !soldier.rows[0].rank_id) return null;
  const rank = await db.query(
    'SELECT level FROM ranks WHERE id=$1', [soldier.rows[0].rank_id]
  );
  return rank.rows.length ? rank.rows[0].level : null;
}

function rankCheck(soldierIdField) {
  return async (req, res, next) => {
    try {
      if (req.user.role === 'commander') return next();

      const soldierId = req.body[soldierIdField] || req.params.id || req.params.soldierId || req.query.soldierId;
      if (!soldierId) return next();

      const evaluatorLevel = await getRankLevel(req.user.id);
      const soldierLevel = await getSoldierRankLevel(soldierId);

      if (evaluatorLevel == null || soldierLevel == null) {
        return res.status(403).json({ error: 'لا يمكن تقييم هذا الفرد' });
      }

      const allowed =
        (req.user.role === 'officer' && evaluatorLevel <= soldierLevel) ||
        (req.user.role === 'nco' && evaluatorLevel < soldierLevel);

      if (!allowed) {
        await createUnauthorizedNotification(req.user, soldierId, soldierLevel);
        return res.status(403).json({ error: 'لا يمكنك تقييم هذا الفرد' });
      }

      next();
    } catch (e) {
      next(e);
    }
  };
}

async function createUnauthorizedNotification(evaluator, soldierId, soldierLevel) {
  try {
    const soldier = await db.query(
      'SELECT name FROM soldiers WHERE id=$1', [soldierId]
    );
    const commander = await db.query(
      "SELECT id FROM users WHERE role='commander' AND is_active=true LIMIT 1"
    );
    if (!commander.rows.length) return;

    await db.query(
      `INSERT INTO notifications (type, title, message, user_id, evaluator_id, evaluator_name, evaluated_id, evaluated_name)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [
        'unauthorized',
        'محاولة تقييم غير مصرح بها',
        `محاولة غير مصرح بها من ${evaluator.name} لتقييم ${soldier.rows[0]?.name || 'جندي'}`,
        commander.rows[0].id,
        evaluator.id,
        evaluator.name,
        soldierId,
        soldier.rows[0]?.name,
      ]
    );
  } catch (_) {}
}

module.exports = { rankCheck, getRankLevel, getSoldierRankLevel };
