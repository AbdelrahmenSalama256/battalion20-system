const db = require('./src/config/db');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const uuid = () => crypto.randomUUID();

async function seed() {
  console.log('🌱 Seeding database...');

  // =========================================================
  // 1. ENSURE RANKS EXIST
  // =========================================================
  let ranks = (await db.query('SELECT id, name, level FROM ranks ORDER BY level')).rows;
  if (!ranks.length) {
    const types = (await db.query('SELECT id, name FROM rank_types')).rows;
    const tMap = {};
    for (const t of types) tMap[t.name] = t.id;

    const data = [
      { type: 'جنود', name: 'جندي', order: 1, level: 1 },
      { type: 'جنود', name: 'جندي أول', order: 2, level: 2 },
      { type: 'صف ضباط', name: 'عريف', order: 3, level: 3 },
      { type: 'صف ضباط', name: 'رقيب', order: 4, level: 4 },
      { type: 'صف ضباط', name: 'رقيب أول', order: 5, level: 5 },
      { type: 'ضباط', name: 'ملازم', order: 6, level: 6 },
      { type: 'ضباط', name: 'ملازم أول', order: 7, level: 7 },
      { type: 'ضباط', name: 'نقيب', order: 8, level: 8 },
      { type: 'ضباط', name: 'رائد', order: 9, level: 9 },
      { type: 'ضباط', name: 'مقدم', order: 10, level: 10 },
      { type: 'ضباط', name: 'عقيد', order: 11, level: 11 },
    ];
    for (const r of data) {
      await db.query(
        'INSERT INTO ranks (id, type_id, name, sort_order, "level") VALUES ($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING',
        [uuid(), tMap[r.type] || null, r.name, r.order, r.level]
      );
    }
    ranks = (await db.query('SELECT id, name, level FROM ranks ORDER BY level')).rows;
  }
  const rankByLevel = Object.fromEntries(ranks.map(r => [r.level, r.id]));
  console.log(`  ✅ ${ranks.length} ranks ready`);

  // =========================================================
  // 2. CREATE USERS (skip if exists)
  // =========================================================
  const usersToCreate = [
    { name: 'قائد الكتيبة', username: 'commander', pass: 'commander123', role: 'commander', rl: 11, perms: { sections: ['specialties', 'general', 'fitness', 'shooting', 'discipline'], canEvaluate: true, canDistinguish: true, canPunish: true } },
    { name: 'ضابط العمليات', username: 'officer1', pass: 'officer123', role: 'officer', rl: 8, perms: { sections: ['specialties', 'general', 'fitness', 'shooting', 'discipline'], canEvaluate: true, canDistinguish: true, canPunish: true } },
    { name: 'ضابط التدريب', username: 'officer2', pass: 'officer123', role: 'officer', rl: 6, perms: { sections: ['general', 'fitness'], canEvaluate: true, canDistinguish: false, canPunish: true } },
    { name: 'صف ضابط الإشارة', username: 'nco1', pass: 'nco123', role: 'nco', rl: 4, perms: { sections: ['specialties'], canEvaluate: true, canDistinguish: false, canPunish: false } },
  ];

  for (const u of usersToCreate) {
    const ex = await db.query('SELECT id FROM users WHERE username=$1', [u.username]);
    if (!ex.rows.length) {
      const hash = await bcrypt.hash(u.pass, 10);
      await db.query(
        'INSERT INTO users (id, name, username, password_hash, role, rank_id, permissions) VALUES ($1,$2,$3,$4,$5,$6,$7)',
        [uuid(), u.name, u.username, hash, u.role, rankByLevel[u.rl] || null, JSON.stringify(u.perms)]
      );
      console.log(`  ✅ User: ${u.name} (${u.username})`);
    } else {
      console.log(`  ⏭️ User exists: ${u.name}`);
    }
  }

  // Give admin full perms
  await db.query(
    "UPDATE users SET role='commander', permissions=$1 WHERE username='admin'",
    [JSON.stringify({ sections: ['specialties', 'general', 'fitness', 'shooting', 'discipline'], canEvaluate: true, canDistinguish: true, canPunish: true })]
  );

  // =========================================================
  // 3. SOLDIERS — always have at least 10
  // =========================================================
  let soldierRows = (await db.query('SELECT id, name FROM soldiers')).rows;
  const weapon = (await db.query('SELECT id FROM weapons LIMIT 1')).rows[0];
  const specialties = (await db.query('SELECT id, name FROM specialties')).rows;
  const statuses = ['active', 'active', 'active', 'leave', 'mission'];

  const moreSoldiers = [
    { n: 'أحمد محمد',   m: '1001', rl: 1 },
    { n: 'خالد حسن',    m: '1002', rl: 1 },
    { n: 'محمود علي',   m: '1003', rl: 2 },
    { n: 'سامي عبدالله', m: '1004', rl: 1 },
    { n: 'عمر إبراهيم',  m: '1005', rl: 1 },
    { n: 'ياسر فؤاد',   m: '1006', rl: 3 },
    { n: 'هاني سعيد',   m: '1007', rl: 4 },
    { n: 'محمد كمال',   m: '1008', rl: 1 },
    { n: 'أسامة نصر',   m: '1009', rl: 3 },
    { n: 'طه أحمد',     m: '1010', rl: 6 },
    { n: 'نصر الدين',   m: '1011', rl: 1 },
    { n: 'باسم فتحي',   m: '1012', rl: 2 },
  ];

  for (let i = 0; i < moreSoldiers.length; i++) {
    const { n: name, m: mid, rl } = moreSoldiers[i];
    const exists = soldierRows.some(s => s.name === name);
    if (!exists) {
      const specId = specialties.length > 0 ? specialties[i % specialties.length].id : null;
      const id = uuid();
      await db.query(
        'INSERT INTO soldiers (id, name, military_id, rank_id, weapon_id, specialty_id, status) VALUES ($1,$2,$3,$4,$5,$6,$7)',
        [id, name, mid, rankByLevel[rl] || null, weapon?.id || null, specId, statuses[i % statuses.length]]
      );
    }
  }

  soldierRows = (await db.query('SELECT id, name FROM soldiers')).rows;
  console.log(`  ✅ ${soldierRows.length} soldiers total`);

  // =========================================================
  // 4. EVALUATIONS
  // =========================================================
  const allUsers = (await db.query('SELECT id, name FROM users')).rows;
  const sectionKeys = ['general', 'fitness', 'shooting', 'discipline'];

  for (const s of soldierRows) {
    const { rows: [{ count }] } = await db.query('SELECT COUNT(*)::int count FROM evaluations WHERE soldier_id=$1', [s.id]);
    if (count > 0) continue;

    const used = new Set();
    const n = 2 + (Math.floor(Math.random() * 3)); // 2-4 evals
    for (let i = 0; i < n; i++) {
      const sk = sectionKeys[Math.floor(Math.random() * sectionKeys.length)];
      if (used.has(sk)) continue;
      used.add(sk);
      const score = 40 + Math.floor(Math.random() * 61);
      const evaluator = allUsers[Math.floor(Math.random() * allUsers.length)];
      await db.query(
        'INSERT INTO evaluations (id, soldier_id, section_key, score, notes, evaluated_by, created_at) VALUES ($1,$2,$3,$4,$5,$6,NOW() - interval \'1 day\' * $7)',
        [uuid(), s.id, sk, score, `تقييم ${sk}`, evaluator?.id || null, i + 1]
      );
    }
  }
  console.log('  ✅ Evaluations added');

  // =========================================================
  // 5. DISTINCTIONS
  // =========================================================
  const dReasons = [
    { reason: 'تميز في التدريب', color: 'gold' },
    { reason: 'مهارة قيادية', color: 'gold' },
    { reason: 'انضباط في العمل', color: 'green' },
    { reason: 'تفوق في الرماية', color: 'silver' },
    { reason: 'إخلاص في العمل', color: 'gold' },
    { reason: 'مشاركة متميزة', color: 'bronze' },
  ];

  for (const s of soldierRows.slice(0, 6)) {
    const { rows: [{ count }] } = await db.query('SELECT COUNT(*)::int count FROM distinctions WHERE soldier_id=$1', [s.id]);
    if (count > 0) continue;

    const d = dReasons[Math.floor(Math.random() * dReasons.length)];
    const ev = allUsers[Math.floor(Math.random() * allUsers.length)];
    const sk = sectionKeys[Math.floor(Math.random() * sectionKeys.length)];
    await db.query(
      'INSERT INTO distinctions (id, soldier_id, section_key, reason, color, given_by, created_at) VALUES ($1,$2,$3,$4,$5,$6,NOW() - interval \'1 day\' * $7)',
      [uuid(), s.id, sk, d.reason, d.color, ev?.id || null, Math.floor(Math.random() * 7)]
    );
  }
  console.log('  ✅ Distinctions added');

  // =========================================================
  // 6. PUNISHMENTS
  // =========================================================
  const pReasons = [
    { reason: 'تأخير عن الدوام - خصم يوم', color: 'red' },
    { reason: 'إهمال في المعدات', color: 'orange' },
    { reason: 'عدم الالتزام بالزي الرسمي', color: 'yellow' },
    { reason: 'تقصير في المهام', color: 'red' },
    { reason: 'سلوك غير منضبط', color: 'orange' },
  ];

  for (const s of soldierRows.slice(4, 9)) {
    const { rows: [{ count }] } = await db.query('SELECT COUNT(*)::int count FROM punishments WHERE soldier_id=$1', [s.id]);
    if (count > 0) continue;

    const p = pReasons[Math.floor(Math.random() * pReasons.length)];
    const ev = allUsers[Math.floor(Math.random() * allUsers.length)];
    const sk = sectionKeys[Math.floor(Math.random() * sectionKeys.length)];
    await db.query(
      'INSERT INTO punishments (id, soldier_id, section_key, reason, color, given_by, created_at) VALUES ($1,$2,$3,$4,$5,$6,NOW() - interval \'1 day\' * $7)',
      [uuid(), s.id, sk, p.reason, p.color, ev?.id || null, Math.floor(Math.random() * 14)]
    );
  }
  console.log('  ✅ Punishments added');

  // =========================================================
  // 7. NOTIFICATIONS
  // =========================================================
  // Remove old notifications so we can re-seed properly
  await db.query('DELETE FROM notifications');
  console.log('  🗑️ Old notifications cleaned');

  const commanders = (await db.query("SELECT id, name FROM users WHERE role='commander'")).rows;
  const templates = [
    { type: 'evaluation', title: 'تقييم جديد', msgGen: (sName) => `تم تقييم ${sName} بنجاح` },
    { type: 'distinction', title: 'تمييز جديد', msgGen: (sName) => `تم تمييز ${sName} لأدائه المتميز` },
    { type: 'punishment', title: 'جزاء جديد', msgGen: (sName) => `تم توقيع جزاء على ${sName}` },
  ];

  for (const commander of commanders) {
    for (let i = 0; i < 4; i++) {
      const soldier = soldierRows[Math.floor(Math.random() * soldierRows.length)];
      const tpl = templates[Math.floor(Math.random() * templates.length)];
      const ev = allUsers[Math.floor(Math.random() * allUsers.length)];

      await db.query(
        'INSERT INTO notifications (id, type, title, message, user_id, evaluator_id, evaluated_id, is_read, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW() - interval \'1 day\' * $9)',
        [uuid(), tpl.type, tpl.title, tpl.msgGen(soldier?.name || 'جندي'), commander?.id, ev?.id || null, soldier?.id, i > 1, 4 - i]
      );
    }
  }
  console.log('  ✅ Notifications added');

  console.log('🎉 Seeding complete!');
}

seed()
  .then(() => process.exit(0))
  .catch(e => {
    console.error('Seed error:', e);
    process.exit(1);
  });
