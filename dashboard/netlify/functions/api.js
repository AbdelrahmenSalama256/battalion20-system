require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Anthropic = require('@anthropic-ai/sdk');
const serverless = require('serverless-http');

const isProd = process.env.NODE_ENV === 'production';
const pool = new Pool({
  connectionString: process.env.DATABASE_URL ? process.env.DATABASE_URL.split('?')[0] : undefined,
  ...(isProd ? { ssl: { rejectUnauthorized: false } } : {}),
  max: 5,
});
const db = { query: (text, params) => pool.query(text, params), pool };
pool.query('SELECT 1').then(() => console.log('DB connected')).catch(e => console.error('DB fail:', e.message));

function auth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return res.status(401).json({ error: 'يرجى تسجيل الدخول أولاً' });
  try {
    req.user = jwt.verify(header.split(' ')[1], process.env.JWT_SECRET);
    next();
  } catch (e) {
    return res.status(401).json({ error: 'انتهت صلاحية الجلسة، يرجى تسجيل الدخول مجدداً' });
  }
}

function commanderOnly(req, res, next) {
  if (req.user.role !== 'commander') return res.status(403).json({ error: 'هذه الميزة متاحة فقط للقائد' });
  next();
}

const app = express();
app.use(helmet());
app.use(cors({ origin: [process.env.FRONTEND_URL || 'http://localhost:5173', 'http://localhost:5173', 'http://localhost:3000'], credentials: true }));
app.use(express.json({ limit: '10mb' }));

app.get('/api/health', async (req, res) => {
  let dbOk = false, dbErr = '';
  try { await db.query('SELECT 1'); dbOk = true; } catch (e) { dbErr = e.message?.substring(0, 100); }
  res.json({
    ok: true, time: new Date().toISOString(),
    db: process.env.DATABASE_URL ? (process.env.DATABASE_URL.includes('pooler') ? 'pooler' : 'direct') : 'NOT SET',
    dbOk, dbErr
  });
});

const er = express.Router();
er.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'يرجى إدخال اسم المستخدم وكلمة المرور' });
    const { rows } = await db.query('SELECT * FROM users WHERE username=$1 AND is_active=true', [username]);
    if (!rows.length) return res.status(401).json({ error: 'اسم مستخدم أو كلمة مرور غير صحيحة' });
    const user = rows[0];
    if (!(await bcrypt.compare(password, user.password_hash))) return res.status(401).json({ error: 'اسم مستخدم أو كلمة مرور غير صحيحة' });
    const token = jwt.sign({ id: user.id, name: user.name, username: user.username, role: user.role }, process.env.JWT_SECRET, { expiresIn: '30d' });
    res.json({ token, user: { id: user.id, name: user.name, username: user.username, role: user.role } });
  } catch (e) { res.status(500).json({ error: 'حدث خطأ في الخادم: ' + e.message }); }
});
er.get('/me', auth, async (req, res) => {
  try {
    const { rows } = await db.query('SELECT id, name, username, role, is_active, created_at FROM users WHERE id=$1', [req.user.id]);
    if (!rows.length) return res.status(404).json({ error: 'المستخدم غير موجود' });
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});
er.patch('/change-password', auth, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const { rows } = await db.query('SELECT password_hash FROM users WHERE id=$1', [req.user.id]);
    if (!(await bcrypt.compare(oldPassword, rows[0].password_hash))) return res.status(400).json({ error: 'كلمة المرور القديمة غير صحيحة' });
    await db.query('UPDATE users SET password_hash=$1 WHERE id=$2', [await bcrypt.hash(newPassword, 10), req.user.id]);
    res.json({ message: 'تم تغيير كلمة المرور بنجاح' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.use('/api/auth', er);

function crud(table, { auth: useAuth, commander: useCommander, searchFields, join } = {}) {
  const r = express.Router();
  const mw = useAuth ? (useCommander ? [auth, commanderOnly] : [auth]) : [];
  const cols = join ? `${table}.*` : '*';
  r.get('/', ...mw, async (req, res) => {
    try {
      let sql = `SELECT ${cols} FROM ${table}${join ? ` ${join}` : ''}`;
      const params = [];
      if (searchFields && req.query.search) {
        const conds = searchFields.map((f, i) => `${f} ILIKE '%'||$${i + 1}||'%'`);
        sql += params.length ? ' AND ' : ' WHERE ';
        sql += conds.join(' OR ');
        params.push(req.query.search);
      }
      sql += ' ORDER BY created_at DESC';
      const { rows } = await pool.query(sql, params);
      res.json(rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
  });
  return r;
}

const rt = express.Router();
rt.get('/', auth, async (req, res) => {
  try {
    const { rows } = await db.query('SELECT rt.*, COUNT(r.id) as rank_count FROM rank_types rt LEFT JOIN ranks r ON r.type_id=rt.id GROUP BY rt.id ORDER BY rt.created_at');
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});
rt.post('/', auth, commanderOnly, async (req, res) => {
  try {
    if (!req.body.name) return res.status(400).json({ error: 'يرجى إدخال اسم فئة الرتبة' });
    const { rows } = await db.query('INSERT INTO rank_types (name, color) VALUES ($1, $2) RETURNING *', [req.body.name, req.body.color || '#c9a84c']);
    res.status(201).json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});
rt.put('/:id', auth, commanderOnly, async (req, res) => {
  try {
    const { rows } = await db.query('UPDATE rank_types SET name=$1, color=$2 WHERE id=$3 RETURNING *', [req.body.name, req.body.color, req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'غير موجود' });
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});
rt.delete('/:id', auth, commanderOnly, async (req, res) => {
  try {
    const { rowCount } = await db.query('DELETE FROM rank_types WHERE id=$1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'غير موجود' });
    res.json({ message: 'تم الحذف بنجاح' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.use('/api/rank-types', rt);

const rk = express.Router();
rk.get('/', auth, async (req, res) => {
  try {
    let sql = 'SELECT r.*, rt.name as type_name, rt.color as type_color FROM ranks r JOIN rank_types rt ON rt.id=r.type_id';
    const params = [];
    if (req.query.typeId) { sql += ' WHERE r.type_id=$1'; params.push(req.query.typeId); }
    sql += ' ORDER BY r.sort_order';
    const { rows } = await db.query(sql, params);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});
rk.post('/', auth, commanderOnly, async (req, res) => {
  try {
    const { typeId, name, sortOrder } = req.body;
    if (!typeId || !name) return res.status(400).json({ error: 'يرجى إدخال البيانات المطلوبة' });
    const { rows } = await db.query('INSERT INTO ranks (type_id, name, sort_order) VALUES ($1, $2, $3) RETURNING *', [typeId, name, sortOrder || 0]);
    res.status(201).json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});
rk.put('/:id', auth, commanderOnly, async (req, res) => {
  try {
    const { rows } = await db.query('UPDATE ranks SET type_id=$1, name=$2, sort_order=$3 WHERE id=$4 RETURNING *', [req.body.typeId, req.body.name, req.body.sortOrder, req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'غير موجود' });
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});
rk.delete('/:id', auth, commanderOnly, async (req, res) => {
  try {
    const { rowCount } = await db.query('DELETE FROM ranks WHERE id=$1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'غير موجود' });
    res.json({ message: 'تم الحذف بنجاح' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.use('/api/ranks', rk);

const wp = express.Router();
wp.get('/', auth, async (req, res) => {
  try {
    const { rows } = await db.query('SELECT w.*, COUNT(s.id)::int as specialty_count FROM weapons w LEFT JOIN specialties s ON s.weapon_id=w.id GROUP BY w.id ORDER BY w.created_at');
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});
wp.post('/', auth, commanderOnly, async (req, res) => {
  try {
    if (!req.body.name) return res.status(400).json({ error: 'يرجى إدخال اسم السلاح' });
    const { rows } = await db.query('INSERT INTO weapons (name, color, icon) VALUES ($1, $2, $3) RETURNING *', [req.body.name, req.body.color || '#2d6a4f', req.body.icon || '⚔️']);
    res.status(201).json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});
wp.put('/:id', auth, commanderOnly, async (req, res) => {
  try {
    const { rows } = await db.query('UPDATE weapons SET name=$1, color=$2, icon=$3 WHERE id=$4 RETURNING *', [req.body.name, req.body.color, req.body.icon, req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'غير موجود' });
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});
wp.delete('/:id', auth, commanderOnly, async (req, res) => {
  try {
    const { rowCount } = await db.query('DELETE FROM weapons WHERE id=$1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'غير موجود' });
    res.json({ message: 'تم الحذف بنجاح' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.use('/api/weapons', wp);

const sp = express.Router();
sp.get('/', auth, async (req, res) => {
  try {
    let sql = 'SELECT s.*, w.name as weapon_name, w.icon as weapon_icon FROM specialties s JOIN weapons w ON w.id=s.weapon_id';
    const params = [];
    if (req.query.weaponId) { sql += ' WHERE s.weapon_id=$1'; params.push(req.query.weaponId); }
    sql += ' ORDER BY s.name';
    const { rows } = await db.query(sql, params);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});
sp.post('/', auth, commanderOnly, async (req, res) => {
  try {
    const { weaponId, name } = req.body;
    if (!weaponId || !name) return res.status(400).json({ error: 'يرجى إدخال البيانات المطلوبة' });
    const { rows } = await db.query('INSERT INTO specialties (weapon_id, name) VALUES ($1, $2) RETURNING *', [weaponId, name]);
    res.status(201).json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});
sp.put('/:id', auth, commanderOnly, async (req, res) => {
  try {
    const { rows } = await db.query('UPDATE specialties SET weapon_id=$1, name=$2 WHERE id=$3 RETURNING *', [req.body.weaponId, req.body.name, req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'غير موجود' });
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});
sp.delete('/:id', auth, commanderOnly, async (req, res) => {
  try {
    const { rowCount } = await db.query('DELETE FROM specialties WHERE id=$1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'غير موجود' });
    res.json({ message: 'تم الحذف بنجاح' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.use('/api/specialties', sp);

const sl = express.Router();
sl.get('/', auth, async (req, res) => {
  try {
    const { search, weaponId, specialtyId } = req.query;
    let sql = `SELECT s.*, r.name rank_name, rt.name rank_type_name, rt.color rank_type_color, w.name weapon_name, w.icon weapon_icon, w.color weapon_color, sp.name specialty_name FROM soldiers s LEFT JOIN ranks r ON r.id=s.rank_id LEFT JOIN rank_types rt ON rt.id=r.type_id LEFT JOIN weapons w ON w.id=s.weapon_id LEFT JOIN specialties sp ON sp.id=s.specialty_id WHERE ($1::text IS NULL OR s.name ILIKE '%'||$1||'%' OR s.military_id ILIKE '%'||$1||'%') AND ($2::uuid IS NULL OR s.weapon_id=$2::uuid)`;
    const params = [search || null, weaponId || null];
    if (specialtyId) { sql += ' AND s.specialty_id=$3::uuid'; params.push(specialtyId); }
    sql += ' ORDER BY s.created_at DESC';
    const { rows } = await db.query(sql, params);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});
sl.get('/:id', auth, async (req, res) => {
  try {
    const soldier = await db.query(`SELECT s.*, r.name rank_name, rt.name rank_type_name, rt.color rank_type_color, w.name weapon_name, w.icon weapon_icon, w.color weapon_color, sp.name specialty_name FROM soldiers s LEFT JOIN ranks r ON r.id=s.rank_id LEFT JOIN rank_types rt ON rt.id=r.type_id LEFT JOIN weapons w ON w.id=s.weapon_id LEFT JOIN specialties sp ON sp.id=s.specialty_id WHERE s.id=$1`, [req.params.id]);
    if (!soldier.rows.length) return res.status(404).json({ error: 'الجندي غير موجود' });
    const results = await db.query('SELECT r.*, e.title as exam_title, e.type as exam_type FROM results r LEFT JOIN exams e ON e.id=r.exam_id WHERE r.soldier_id=$1 ORDER BY r.created_at DESC LIMIT 10', [req.params.id]);
    res.json({ ...soldier.rows[0], results: results.rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
sl.post('/', auth, async (req, res) => {
  try {
    if (!req.body.name) return res.status(400).json({ error: 'يرجى إدخال اسم الجندي' });
    const { rows } = await db.query('INSERT INTO soldiers (name, military_id, rank_id, weapon_id, specialty_id, notes) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *', [req.body.name, req.body.militaryId || null, req.body.rankId || null, req.body.weaponId || null, req.body.specialtyId || null, req.body.notes || null]);
    res.status(201).json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});
sl.put('/:id', auth, async (req, res) => {
  try {
    const { rows } = await db.query('UPDATE soldiers SET name=$1, military_id=$2, rank_id=$3, weapon_id=$4, specialty_id=$5, notes=$6 WHERE id=$7 RETURNING *', [req.body.name, req.body.militaryId, req.body.rankId, req.body.weaponId, req.body.specialtyId, req.body.notes, req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'الجندي غير موجود' });
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});
sl.delete('/:id', auth, commanderOnly, async (req, res) => {
  try {
    const { rowCount } = await db.query('DELETE FROM soldiers WHERE id=$1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'الجندي غير موجود' });
    res.json({ message: 'تم الحذف بنجاح' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.use('/api/soldiers', sl);

const ex = express.Router();
ex.get('/', auth, async (req, res) => {
  try {
    const { type, weaponId } = req.query;
    const { rows } = await db.query(`SELECT e.*, w.name weapon_name, w.icon weapon_icon, sp.name specialty_name, COUNT(DISTINCT ei.id)::int item_count, COUNT(DISTINCT r.id)::int result_count, ROUND(AVG(r.total_score),1) avg_score FROM exams e LEFT JOIN weapons w ON w.id=e.weapon_id LEFT JOIN specialties sp ON sp.id=e.specialty_id LEFT JOIN exam_items ei ON ei.exam_id=e.id LEFT JOIN results r ON r.exam_id=e.id WHERE ($1::text IS NULL OR e.type=$1::text) AND ($2::uuid IS NULL OR e.weapon_id=$2::uuid) GROUP BY e.id,w.name,w.icon,sp.name ORDER BY e.created_at DESC`, [type || null, weaponId || null]);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});
ex.get('/:id', auth, async (req, res) => {
  try {
    const exam = await db.query(`SELECT e.*, w.name weapon_name, w.icon weapon_icon, w.color weapon_color, sp.name specialty_name FROM exams e LEFT JOIN weapons w ON w.id=e.weapon_id LEFT JOIN specialties sp ON sp.id=e.specialty_id WHERE e.id=$1`, [req.params.id]);
    if (!exam.rows.length) return res.status(404).json({ error: 'الامتحان غير موجود' });
    const items = await db.query('SELECT * FROM exam_items WHERE exam_id=$1 ORDER BY sort_order', [req.params.id]);
    res.json({ ...exam.rows[0], items: items.rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
ex.post('/', auth, async (req, res) => {
  try {
    const { title, type, weaponId, specialtyId, items } = req.body;
    if (!title || !items?.length) return res.status(400).json({ error: 'يرجى إدخال عنوان الامتحان وبنوده' });
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const exam = await client.query('INSERT INTO exams (title, type, weapon_id, specialty_id, created_by) VALUES ($1,$2,$3,$4,$5) RETURNING *', [title, type || 'general', weaponId || null, specialtyId || null, req.user.id]);
      for (let i = 0; i < items.length; i++) await client.query('INSERT INTO exam_items (exam_id, text, max_score, sort_order) VALUES ($1,$2,$3,$4)', [exam.rows[0].id, items[i].text, items[i].maxScore || 10, i]);
      await client.query('COMMIT');
      res.status(201).json(exam.rows[0]);
    } catch (e) { await client.query('ROLLBACK'); throw e; } finally { client.release(); }
  } catch (e) { res.status(500).json({ error: e.message }); }
});
ex.put('/:id', auth, async (req, res) => {
  try {
    const { title, type, weaponId, specialtyId, items } = req.body;
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const exam = await client.query('UPDATE exams SET title=$1, type=$2, weapon_id=$3, specialty_id=$4 WHERE id=$5 RETURNING *', [title, type, weaponId || null, specialtyId || null, req.params.id]);
      if (!exam.rows.length) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'الامتحان غير موجود' }); }
      await client.query('DELETE FROM exam_items WHERE exam_id=$1', [req.params.id]);
      for (let i = 0; i < items.length; i++) await client.query('INSERT INTO exam_items (exam_id, text, max_score, sort_order) VALUES ($1,$2,$3,$4)', [req.params.id, items[i].text, items[i].maxScore || 10, i]);
      await client.query('COMMIT');
      const full = await db.query('SELECT * FROM exam_items WHERE exam_id=$1 ORDER BY sort_order', [req.params.id]);
      res.json({ ...exam.rows[0], items: full.rows });
    } catch (e) { await client.query('ROLLBACK'); throw e; } finally { client.release(); }
  } catch (e) { res.status(500).json({ error: e.message }); }
});
ex.delete('/:id', auth, commanderOnly, async (req, res) => {
  try {
    const { rowCount } = await db.query('DELETE FROM exams WHERE id=$1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'الامتحان غير موجود' });
    res.json({ message: 'تم الحذف بنجاح' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.use('/api/exams', ex);

const rs = express.Router();
rs.get('/', auth, async (req, res) => {
  try {
    const { type, weaponId, soldierId, page = 1, limit = 30 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const { rows } = await db.query(`SELECT r.*, s.name soldier_name, s.military_id, e.title exam_title, e.type exam_type, u.name entered_by_name, COUNT(*) OVER() as total_count FROM results r JOIN soldiers s ON s.id=r.soldier_id LEFT JOIN exams e ON e.id=r.exam_id LEFT JOIN users u ON u.id=r.entered_by WHERE ($1::text IS NULL OR r.result_type=$1::text) AND ($2::uuid IS NULL OR s.weapon_id=$2::uuid) AND ($3::uuid IS NULL OR r.soldier_id=$3::uuid) ORDER BY r.created_at DESC LIMIT $4 OFFSET $5`, [type || null, weaponId || null, soldierId || null, parseInt(limit), offset]);
    const total = rows.length ? parseInt(rows[0].total_count) : 0;
    res.json({ results: rows, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
rs.get('/stats', auth, async (req, res) => {
  try {
    const counts = await db.query('SELECT (SELECT COUNT(*) FROM soldiers) total_soldiers, (SELECT COUNT(*) FROM results) total_results, COALESCE(ROUND((SELECT AVG(total_score) FROM results), 1), 0) avg_score, COALESCE(ROUND((SELECT COUNT(*) FROM results WHERE total_score >= 50) * 100.0 / NULLIF((SELECT COUNT(*) FROM results), 0), 1), 0) pass_rate');
    const byWeapon = await db.query('SELECT w.name weapon_name, w.icon weapon_icon, COUNT(r.id)::int count, ROUND(AVG(r.total_score), 1) avg, COALESCE(ROUND(COUNT(CASE WHEN r.total_score >= 50 THEN 1 END) * 100.0 / NULLIF(COUNT(r.id), 0), 1), 0) pass_rate FROM weapons w LEFT JOIN soldiers s ON s.weapon_id=w.id LEFT JOIN results r ON r.soldier_id=s.id GROUP BY w.id,w.name,w.icon ORDER BY count DESC');
    const distribution = await db.query('SELECT COUNT(CASE WHEN total_score >= 90 THEN 1 END)::int excellent, COUNT(CASE WHEN total_score >= 75 AND total_score < 90 THEN 1 END)::int very_good, COUNT(CASE WHEN total_score >= 65 AND total_score < 75 THEN 1 END)::int good, COUNT(CASE WHEN total_score >= 50 AND total_score < 65 THEN 1 END)::int acceptable, COUNT(CASE WHEN total_score < 50 THEN 1 END)::int fail FROM results');
    const recent = await db.query('SELECT r.*, s.name soldier_name, s.military_id, e.title exam_title FROM results r JOIN soldiers s ON s.id=r.soldier_id LEFT JOIN exams e ON e.id=r.exam_id ORDER BY r.created_at DESC LIMIT 8');
    res.json({ ...counts.rows[0], byWeapon: byWeapon.rows, distribution: distribution.rows[0], recentResults: recent.rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
rs.get('/:id', auth, async (req, res) => {
  try {
    const result = await db.query('SELECT r.*, s.name soldier_name, s.military_id, e.title exam_title, e.type exam_type, u.name entered_by_name FROM results r JOIN soldiers s ON s.id=r.soldier_id LEFT JOIN exams e ON e.id=r.exam_id LEFT JOIN users u ON u.id=r.entered_by WHERE r.id=$1', [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ error: 'النتيجة غير موجودة' });
    const scores = await db.query('SELECT ris.*, ei.text item_text, ei.max_score FROM result_item_scores ris LEFT JOIN exam_items ei ON ei.id=ris.item_id WHERE ris.result_id=$1', [req.params.id]);
    res.json({ ...result.rows[0], scores: scores.rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
rs.post('/', auth, async (req, res) => {
  try {
    const { examId, soldierId, scores, notes, resultType, examDate } = req.body;
    if (!examId || !soldierId || !scores?.length) return res.status(400).json({ error: 'يرجى إدخال البيانات المطلوبة' });
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const items = await client.query('SELECT id, max_score FROM exam_items WHERE exam_id=$1 ORDER BY sort_order', [examId]);
      if (!items.rows.length) { await client.query('ROLLBACK'); return res.status(400).json({ error: 'الامتحان لا يحتوي على بنود' }); }
      let totalGot = 0, totalMax = 0;
      for (const item of items.rows) { const score = scores.find(s => s.itemId === item.id); const val = score ? parseFloat(score.value) : 0; totalGot += val; totalMax += parseFloat(item.max_score); }
      const totalScore = totalMax > 0 ? Math.round((totalGot / totalMax) * 100 * 100) / 100 : 0;
      const result = await client.query('INSERT INTO results (exam_id, soldier_id, result_type, total_score, notes, exam_date, entered_by) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *', [examId, soldierId, resultType || 'exam', totalScore, notes || null, examDate || new Date().toISOString().split('T')[0], req.user.id]);
      for (const item of items.rows) { const score = scores.find(s => s.itemId === item.id); const val = score ? parseFloat(score.value) : 0; await client.query('INSERT INTO result_item_scores (result_id, item_id, score_value) VALUES ($1,$2,$3)', [result.rows[0].id, item.id, val]); }
      await client.query('COMMIT');
      res.status(201).json({ ...result.rows[0], totalScore });
    } catch (e) { await client.query('ROLLBACK'); throw e; } finally { client.release(); }
  } catch (e) { res.status(500).json({ error: e.message }); }
});
rs.delete('/:id', auth, commanderOnly, async (req, res) => {
  try {
    const { rowCount } = await db.query('DELETE FROM results WHERE id=$1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'النتيجة غير موجودة' });
    res.json({ message: 'تم الحذف بنجاح' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.use('/api/results', rs);

const ft = express.Router();
ft.get('/exercises', auth, async (req, res) => {
  try { const { rows } = await db.query('SELECT * FROM fitness_exercises ORDER BY name'); res.json(rows); } catch (e) { res.status(500).json({ error: e.message }); }
});
ft.post('/exercises', auth, commanderOnly, async (req, res) => {
  try {
    if (!req.body.name) return res.status(400).json({ error: 'يرجى إدخال اسم التمرين' });
    const { rows } = await db.query('INSERT INTO fitness_exercises (name, unit, higher_is_better, pass_mark) VALUES ($1,$2,$3,$4) RETURNING *', [req.body.name, req.body.unit || null, req.body.higherIsBetter !== false, req.body.passMark || 60]);
    res.status(201).json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});
ft.put('/exercises/:id', auth, commanderOnly, async (req, res) => {
  try {
    const { rows } = await db.query('UPDATE fitness_exercises SET name=$1, unit=$2, higher_is_better=$3, pass_mark=$4 WHERE id=$5 RETURNING *', [req.body.name, req.body.unit, req.body.higherIsBetter, req.body.passMark, req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'غير موجود' });
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});
ft.delete('/exercises/:id', auth, commanderOnly, async (req, res) => {
  try {
    const { rowCount } = await db.query('DELETE FROM fitness_exercises WHERE id=$1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'غير موجود' });
    res.json({ message: 'تم الحذف بنجاح' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
ft.post('/results', auth, async (req, res) => {
  try {
    const { soldierId, results, notes, examDate } = req.body;
    if (!soldierId || !results?.length) return res.status(400).json({ error: 'يرجى إدخال البيانات المطلوبة' });
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      let totalPercent = 0;
      const fitnessRows = [];
      for (const r of results) {
        const ex = await client.query('SELECT * FROM fitness_exercises WHERE id=$1', [r.exerciseId]);
        if (!ex.rows.length) continue;
        const e = ex.rows[0]; const value = parseFloat(r.value);
        const pct = Math.round(Math.min((e.higher_is_better ? value / e.pass_mark : e.pass_mark / Math.max(value, 1)) * 100, 100) * 100) / 100;
        totalPercent += pct;
        fitnessRows.push({ exerciseId: e.id, value, pct, name: e.name });
      }
      const avgScore = results.length > 0 ? Math.round((totalPercent / results.length) * 100) / 100 : 0;
      const result = await client.query('INSERT INTO results (soldier_id, result_type, total_score, notes, exam_date, entered_by) VALUES ($1,\'fitness\',$2,$3,$4,$5) RETURNING *', [soldierId, avgScore, notes || null, examDate || new Date().toISOString().split('T')[0], req.user.id]);
      for (const fr of fitnessRows) await client.query('INSERT INTO fitness_results (soldier_id, exercise_id, score_value, score_percent, result_id) VALUES ($1,$2,$3,$4,$5)', [soldierId, fr.exerciseId, fr.value, fr.pct, result.rows[0].id]);
      await client.query('COMMIT');
      res.status(201).json({ ...result.rows[0], fitnessDetails: fitnessRows });
    } catch (e) { await client.query('ROLLBACK'); throw e; } finally { client.release(); }
  } catch (e) { res.status(500).json({ error: e.message }); }
});
ft.get('/results', auth, async (req, res) => {
  try {
    const { soldierId, page = 1, limit = 30 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const { rows } = await db.query('SELECT fr.*, fe.name exercise_name, fe.unit, s.name soldier_name, s.military_id, r.total_score, r.exam_date FROM fitness_results fr JOIN fitness_exercises fe ON fe.id=fr.exercise_id JOIN soldiers s ON s.id=fr.soldier_id JOIN results r ON r.id=fr.result_id WHERE ($1::uuid IS NULL OR fr.soldier_id=$1::uuid) ORDER BY fr.created_at DESC LIMIT $2 OFFSET $3', [soldierId || null, parseInt(limit), offset]);
    res.json({ results: rows, page: parseInt(page), limit: parseInt(limit) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.use('/api/fitness', ft);

const an = express.Router();
an.get('/', auth, async (req, res) => {
  try {
    const { rows } = await db.query('SELECT a.*, u.name created_by_name FROM announcements a LEFT JOIN users u ON u.id=a.created_by ORDER BY a.created_at DESC');
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});
an.post('/', auth, commanderOnly, async (req, res) => {
  try {
    if (!req.body.title) return res.status(400).json({ error: 'يرجى إدخال عنوان الإعلان' });
    const { rows } = await db.query('INSERT INTO announcements (title, body, priority, created_by) VALUES ($1,$2,$3,$4) RETURNING *', [req.body.title, req.body.body || null, req.body.priority || 'normal', req.user.id]);
    const creator = await db.query('SELECT name FROM users WHERE id=$1', [req.user.id]);
    res.status(201).json({ ...rows[0], created_by_name: creator.rows[0]?.name });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
an.delete('/:id', auth, commanderOnly, async (req, res) => {
  try {
    const { rowCount } = await db.query('DELETE FROM announcements WHERE id=$1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'الإعلان غير موجود' });
    res.json({ message: 'تم الحذف بنجاح' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.use('/api/announcements', an);

const us = express.Router();
us.get('/', auth, commanderOnly, async (req, res) => {
  try { const { rows } = await db.query('SELECT id, name, username, role, is_active, created_at FROM users ORDER BY created_at'); res.json(rows); } catch (e) { res.status(500).json({ error: e.message }); }
});
us.post('/', auth, commanderOnly, async (req, res) => {
  try {
    const { name, username, password, role } = req.body;
    if (!name || !username || !password) return res.status(400).json({ error: 'يرجى إدخال جميع البيانات' });
    const exists = await db.query('SELECT id FROM users WHERE username=$1', [username]);
    if (exists.rows.length) return res.status(400).json({ error: 'اسم المستخدم موجود بالفعل' });
    const { rows } = await db.query('INSERT INTO users (name, username, password_hash, role) VALUES ($1,$2,$3,$4) RETURNING id, name, username, role, is_active, created_at', [name, username, await bcrypt.hash(password, 10), role || 'officer']);
    res.status(201).json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});
us.patch('/:id/password', auth, commanderOnly, async (req, res) => {
  try {
    if (!req.body.password) return res.status(400).json({ error: 'يرجى إدخال كلمة المرور الجديدة' });
    await db.query('UPDATE users SET password_hash=$1 WHERE id=$2', [await bcrypt.hash(req.body.password, 10), req.params.id]);
    res.json({ message: 'تم تغيير كلمة المرور بنجاح' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
us.patch('/:id/toggle', auth, commanderOnly, async (req, res) => {
  try {
    if (req.params.id === req.user.id) return res.status(400).json({ error: 'لا يمكنك تعطيل حسابك الخاص' });
    const { rows } = await db.query('UPDATE users SET is_active = NOT is_active WHERE id=$1 RETURNING id, is_active', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'المستخدم غير موجود' });
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});
us.delete('/:id', auth, commanderOnly, async (req, res) => {
  try {
    if (req.params.id === req.user.id) return res.status(400).json({ error: 'لا يمكنك حذف حسابك' });
    const { rowCount } = await db.query('DELETE FROM users WHERE id=$1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'المستخدم غير موجود' });
    res.json({ message: 'تم الحذف بنجاح' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.use('/api/users', us);

const ai = express.Router();
ai.post('/ask', auth, async (req, res) => {
  try {
    if (!req.body.question) return res.status(400).json({ error: 'يرجى إدخال السؤال' });
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'مفتاح Anthropic API غير مضبوط في الخادم' });
    const msg = await new Anthropic({ apiKey }).messages.create({ model: "claude-sonnet-4-20250514", max_tokens: 900, system: req.body.system || 'أنت مساعد ذكي لنظام تقييم كتيبة عسكرية', messages: [{ role: "user", content: req.body.question }] });
    res.json({ reply: msg.content[0].text });
  } catch (e) { res.status(500).json({ error: 'فشل الاتصال بـ AI: ' + e.message }); }
});
app.use('/api/ai', ai);

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'حدث خطأ غير متوقع' });
});

exports.handler = serverless(app);
