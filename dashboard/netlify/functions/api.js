require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const serverless = require('serverless-http');

const isProd = process.env.NODE_ENV === 'production';
const pool = new Pool({
  connectionString: process.env.DATABASE_URL ? process.env.DATABASE_URL.split('?')[0] : undefined,
  ...(isProd ? { ssl: { rejectUnauthorized: false } } : {}),
  max: 5,
});
const db = { query: (text, params) => pool.query(text, params), pool };

(async()=>{try{
  await pool.query('SELECT 1'); console.log('DB connected');
  await pool.query("ALTER TABLE soldiers ADD COLUMN IF NOT EXISTS specific_specialty VARCHAR(200)");
  await pool.query("ALTER TABLE soldiers ADD COLUMN IF NOT EXISTS distinction_badge VARCHAR(10)");
  await pool.query("ALTER TABLE soldiers ADD COLUMN IF NOT EXISTS distinction_citation TEXT");
  await pool.query("ALTER TABLE soldiers ADD COLUMN IF NOT EXISTS distinguished_by UUID REFERENCES users(id) ON DELETE SET NULL");
  await pool.query("ALTER TABLE soldiers ADD COLUMN IF NOT EXISTS distinguished_at TIMESTAMPTZ");
  await pool.query("ALTER TABLE soldiers ADD COLUMN IF NOT EXISTS promoted BOOLEAN DEFAULT FALSE");
  await pool.query("ALTER TABLE results ADD COLUMN IF NOT EXISTS fitness_score NUMERIC(6,2)");
  await pool.query("ALTER TABLE results ADD COLUMN IF NOT EXISTS specialty_score NUMERIC(6,2)");
  await pool.query("ALTER TABLE results ADD COLUMN IF NOT EXISTS discipline_score NUMERIC(6,2)");
  await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS rank_id UUID");
  try{await pool.query("ALTER TABLE users ADD CONSTRAINT fk_user_rank FOREIGN KEY(rank_id) REFERENCES ranks(id) ON DELETE SET NULL")}catch(e){}
  await pool.query("CREATE TABLE IF NOT EXISTS notifications (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), type VARCHAR(50) DEFAULT 'evaluation', message TEXT, evaluator_id UUID REFERENCES users(id) ON DELETE SET NULL, evaluator_name VARCHAR(120), evaluator_rank VARCHAR(80), evaluator_weapon VARCHAR(100), evaluated_id UUID REFERENCES soldiers(id) ON DELETE CASCADE, evaluated_name VARCHAR(150), evaluated_rank VARCHAR(80), evaluated_specialty VARCHAR(100), fitness_score NUMERIC(6,2), specialty_score NUMERIC(6,2), discipline_score NUMERIC(6,2), total_score NUMERIC(6,2), is_read BOOLEAN DEFAULT FALSE, created_at TIMESTAMPTZ DEFAULT NOW())");
  console.log('Migrations done');
}catch(e){console.error('Migration:',e.message)}})();

function auth(req,res,next){
  const h=req.headers.authorization;
  if(!h||!h.startsWith('Bearer ')) return res.status(401).json({error:'يرجى تسجيل الدخول أولاً'});
  try{req.user=jwt.verify(h.split(' ')[1],process.env.JWT_SECRET);next()}
  catch(e){return res.status(401).json({error:'انتهت صلاحية الجلسة'})}
}
function commanderOnly(req,res,next){
  if(req.user.role!=='commander') return res.status(403).json({error:'متاحة فقط للقائد'});
  next();
}
function cn(v){return v!=null&&!isNaN(v)?Number(v):null}

const app=express();
app.use(helmet());
app.use(cors({origin:[process.env.FRONTEND_URL||'http://localhost:5173','http://localhost:5173','http://localhost:3000'],credentials:true}));
app.use(express.json({limit:'10mb'}));
app.use((req,res,next)=>{
  if(req.path.startsWith('/.netlify/functions/api'))
    req.url='/api'+req.url.substring('/.netlify/functions/api'.length);
  next();
});

app.get('/api/health',(req,res)=>res.json({ok:true,time:new Date().toISOString()}));
app.get('/api',(req,res)=>res.json({ok:true,name:'Battalion 20 API',version:'3.0.0'}));

// AUTH
const er=express.Router();
er.post('/login',async(req,res)=>{
  try{
    const{username,password}=req.body;
    if(!username||!password) return res.status(400).json({error:'يرجى إدخال البيانات'});
    const{rows}=await db.query("SELECT u.id,u.name,u.username,u.password_hash,u.role,u.is_active,u.created_at,u.rank_id,r.name rank_name,r.sort_order rank_order FROM users u LEFT JOIN ranks r ON r.id=u.rank_id::uuid WHERE u.username=$1 AND u.is_active=true",[username]);
    if(!rows.length||!(await bcrypt.compare(password,rows[0].password_hash)))
      return res.status(401).json({error:'بيانات الدخول غير صحيحة'});
    const u=rows[0];
    const token=jwt.sign({id:u.id,name:u.name,username:u.username,role:u.role,rankId:u.rank_id,rankOrder:u.rank_order},process.env.JWT_SECRET,{expiresIn:'24h'});
    res.json({token,user:{id:u.id,name:u.name,username:u.username,role:u.role,rankId:u.rank_id}});
  }catch(e){res.status(500).json({error:e.message})}
});
er.get('/me',auth,async(req,res)=>{
  try{
    const{rows}=await db.query("SELECT u.id,u.name,u.username,u.role,r.name rank_name FROM users u LEFT JOIN ranks r ON r.id=u.rank_id WHERE u.id=$1",[req.user.id]);
    if(!rows.length) return res.status(404).json({error:'غير موجود'});
    res.json(rows[0]);
  }catch(e){res.status(500).json({error:e.message})}
});
er.patch('/change-password',auth,async(req,res)=>{
  try{
    const{oldPassword,newPassword}=req.body;
    if(!oldPassword||!newPassword) return res.status(400).json({error:'يرجى إدخال البيانات'});
    const{rows}=await db.query('SELECT password_hash FROM users WHERE id=$1',[req.user.id]);
    if(!rows.length||!(await bcrypt.compare(oldPassword,rows[0].password_hash)))
      return res.status(400).json({error:'كلمة المرور القديمة غير صحيحة'});
    await db.query('UPDATE users SET password_hash=$1 WHERE id=$2',[await bcrypt.hash(newPassword,10),req.user.id]);
    res.json({message:'تم التغيير بنجاح'});
  }catch(e){res.status(500).json({error:e.message})}
});
app.use('/api/auth',er);

// SOLDIERS
const sl=express.Router();
sl.get('/',auth,async(req,res)=>{
  try{
    const{search,weaponId,specialtyId}=req.query;
    let sql="SELECT s.*,r.name rank_name,r.sort_order rank_order,rt.name rank_type,rt.color rank_color,w.name weapon_name,w.icon weapon_icon,sp.name specialty_name FROM soldiers s LEFT JOIN ranks r ON r.id=s.rank_id LEFT JOIN rank_types rt ON rt.id=r.type_id LEFT JOIN weapons w ON w.id=s.weapon_id LEFT JOIN specialties sp ON sp.id=s.specialty_id WHERE 1=1";
    const p=[];let i=1;
    if(search){sql+=` AND (s.name ILIKE $${i} OR s.military_id ILIKE $${i})`;p.push(`%${search}%`);i++}
    if(weaponId){sql+=` AND s.weapon_id=$${i}`;p.push(weaponId);i++}
    if(specialtyId){sql+=` AND s.specialty_id=$${i}`;p.push(specialtyId);i++}
    sql+=' ORDER BY r.sort_order DESC NULLS LAST, s.name';
    const{rows}=await db.query(sql,p);
    res.json(rows);
  }catch(e){res.status(500).json({error:e.message})}
});
sl.get('/:id',auth,async(req,res)=>{
  try{
    const{rows}=await db.query("SELECT s.*,r.name rank_name,r.sort_order rank_order,rt.name rank_type,rt.color rank_color,w.name weapon_name,w.icon weapon_icon,sp.name specialty_name,u.name distinguished_by_name FROM soldiers s LEFT JOIN ranks r ON r.id=s.rank_id LEFT JOIN rank_types rt ON rt.id=r.type_id LEFT JOIN weapons w ON w.id=s.weapon_id LEFT JOIN specialties sp ON sp.id=s.specialty_id LEFT JOIN users u ON u.id=s.distinguished_by WHERE s.id=$1",[req.params.id]);
    if(!rows.length) return res.status(404).json({error:'غير موجود'});
    res.json(rows[0]);
  }catch(e){res.status(500).json({error:e.message})}
});
sl.post('/',auth,async(req,res)=>{
  try{
    const{name,militaryId,rankId,weaponId,specialtyId,specificSpecialty,notes}=req.body;
    if(!name) return res.status(400).json({error:'يرجى إدخال الاسم'});
    const{rows}=await db.query('INSERT INTO soldiers(name,military_id,rank_id,weapon_id,specialty_id,specific_specialty,notes) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *',[name,militaryId||null,rankId||null,weaponId||null,specialtyId||null,specificSpecialty||null,notes||null]);
    res.status(201).json(rows[0]);
  }catch(e){res.status(500).json({error:e.message})}
});
sl.put('/:id',auth,async(req,res)=>{
  try{
    const{name,militaryId,rankId,weaponId,specialtyId,specificSpecialty,notes}=req.body;
    const{rows}=await db.query('UPDATE soldiers SET name=$1,military_id=$2,rank_id=$3,weapon_id=$4,specialty_id=$5,specific_specialty=$6,notes=$7 WHERE id=$8 RETURNING *',[name,militaryId||null,rankId||null,weaponId||null,specialtyId||null,specificSpecialty||null,notes||null,req.params.id]);
    if(!rows.length) return res.status(404).json({error:'غير موجود'});
    res.json(rows[0]);
  }catch(e){res.status(500).json({error:e.message})}
});
sl.delete('/:id',auth,commanderOnly,async(req,res)=>{
  try{
    const{rowCount}=await db.query('DELETE FROM soldiers WHERE id=$1',[req.params.id]);
    if(!rowCount) return res.status(404).json({error:'غير موجود'});
    res.json({message:'تم الحذف'});
  }catch(e){res.status(500).json({error:e.message})}
});
sl.post('/:id/distinguish',auth,commanderOnly,async(req,res)=>{
  try{
    const{badge,citation}=req.body;
    if(!badge||!['gold','silver','bronze'].includes(badge)) return res.status(400).json({error:'نوع الوسام غير صحيح'});
    const{rows}=await db.query('UPDATE soldiers SET distinction_badge=$1,distinction_citation=$2,distinguished_by=$3,distinguished_at=NOW() WHERE id=$4 RETURNING *',[badge,citation||null,req.user.id,req.params.id]);
    if(!rows.length) return res.status(404).json({error:'غير موجود'});
    res.json(rows[0]);
  }catch(e){res.status(500).json({error:e.message})}
});
sl.delete('/:id/distinguish',auth,commanderOnly,async(req,res)=>{
  try{
    const{rows}=await db.query('UPDATE soldiers SET distinction_badge=NULL,distinction_citation=NULL,distinguished_by=NULL,distinguished_at=NULL WHERE id=$1 RETURNING *',[req.params.id]);
    res.json(rows[0]);
  }catch(e){res.status(500).json({error:e.message})}
});
app.use('/api/soldiers',sl);

// WEAPONS & SPECIALTIES & RANKS
const wp=express.Router();
wp.get('/',auth,async(req,res)=>{try{const{rows}=await db.query('SELECT * FROM weapons ORDER BY name');res.json(rows)}catch(e){res.status(500).json({error:e.message})}});
wp.post('/',auth,commanderOnly,async(req,res)=>{
  try{if(!req.body.name)return res.status(400).json({error:'يرجى إدخال الاسم'});
    const{rows}=await db.query('INSERT INTO weapons(name,icon)VALUES($1,$2)RETURNING *',[req.body.name,req.body.icon||null]);
    res.status(201).json(rows[0]);
  }catch(e){res.status(500).json({error:e.message})}
});
wp.delete('/:id',auth,commanderOnly,async(req,res)=>{
  try{const{rowCount}=await db.query('DELETE FROM weapons WHERE id=$1',[req.params.id]);
    if(!rowCount)return res.status(404).json({error:'غير موجود'});res.json({message:'تم الحذف'});
  }catch(e){res.status(500).json({error:e.message})}
});
app.use('/api/weapons',wp);
const sp=express.Router();
sp.get('/',auth,async(req,res)=>{
  try{const{weaponId}=req.query;
    const{rows}=weaponId?await db.query('SELECT * FROM specialties WHERE weapon_id=$1 ORDER BY name',[weaponId]):await db.query('SELECT * FROM specialties ORDER BY name');
    res.json(rows)
  }catch(e){res.status(500).json({error:e.message})}
});
sp.post('/',auth,commanderOnly,async(req,res)=>{
  try{if(!req.body.name)return res.status(400).json({error:'يرجى إدخال الاسم'});
    const{rows}=await db.query('INSERT INTO specialties(name,weapon_id)VALUES($1,$2)RETURNING *',[req.body.name,req.body.weaponId||null]);
    res.status(201).json(rows[0]);
  }catch(e){res.status(500).json({error:e.message})}
});
sp.delete('/:id',auth,commanderOnly,async(req,res)=>{
  try{const{rowCount}=await db.query('DELETE FROM specialties WHERE id=$1',[req.params.id]);
    if(!rowCount)return res.status(404).json({error:'غير موجود'});res.json({message:'تم الحذف'});
  }catch(e){res.status(500).json({error:e.message})}
});
app.use('/api/specialties',sp);
const rk=express.Router();
rk.get('/',auth,async(req,res)=>{
  try{const{typeId}=req.query;
    const{rows}=typeId?await db.query('SELECT * FROM ranks WHERE type_id=$1 ORDER BY sort_order',[typeId]):await db.query('SELECT * FROM ranks ORDER BY sort_order');
    res.json(rows)
  }catch(e){res.status(500).json({error:e.message})}
});
rk.get('/types',auth,async(req,res)=>{try{const{rows}=await db.query('SELECT * FROM rank_types ORDER BY name');res.json(rows)}catch(e){res.status(500).json({error:e.message})}});
app.use('/api/ranks',rk);

// EXAMS
const ex=express.Router();
ex.get('/',auth,async(req,res)=>{
  try{
    const{type,weaponId}=req.query;
    const{rows}=await db.query("SELECT e.*,w.name weapon_name,w.icon weapon_icon,sp.name specialty_name,COUNT(DISTINCT ei.id)::int item_count,COUNT(DISTINCT r.id)::int result_count,ROUND(AVG(r.total_score),1) avg_score FROM exams e LEFT JOIN weapons w ON w.id=e.weapon_id LEFT JOIN specialties sp ON sp.id=e.specialty_id LEFT JOIN exam_items ei ON ei.exam_id=e.id LEFT JOIN results r ON r.exam_id=e.id WHERE($1::text IS NULL OR e.type=$1::text)AND($2::uuid IS NULL OR e.weapon_id=$2::uuid) GROUP BY e.id,w.name,w.icon,sp.name ORDER BY e.created_at DESC",[type||null,weaponId||null]);
    res.json(rows.map(r=>({...r,avg_score:r.avg_score!=null?Number(r.avg_score):null})));
  }catch(e){res.status(500).json({error:e.message})}
});
ex.get('/:id',auth,async(req,res)=>{
  try{
    const exam=await db.query("SELECT e.*,w.name weapon_name,w.icon weapon_icon,w.color weapon_color,sp.name specialty_name FROM exams e LEFT JOIN weapons w ON w.id=e.weapon_id LEFT JOIN specialties sp ON sp.id=e.specialty_id WHERE e.id=$1",[req.params.id]);
    if(!exam.rows.length) return res.status(404).json({error:'غير موجود'});
    const items=await db.query('SELECT * FROM exam_items WHERE exam_id=$1 ORDER BY sort_order',[req.params.id]);
    res.json({...exam.rows[0],items:items.rows});
  }catch(e){res.status(500).json({error:e.message})}
});
ex.post('/',auth,async(req,res)=>{
  try{
    const{title,type,weaponId,specialtyId,items}=req.body;
    if(!title||!items?.length) return res.status(400).json({error:'يرجى إدخال البيانات'});
    const exam=await db.query('INSERT INTO exams(title,type,weapon_id,specialty_id,created_by) VALUES($1,$2,$3,$4,$5) RETURNING *',[title,type||'general',weaponId||null,specialtyId||null,req.user.id]);
    for(const item of items)
      await db.query('INSERT INTO exam_items(exam_id,text,max_score,sort_order) VALUES($1,$2,$3,$4)',[exam.rows[0].id,item.text,item.maxScore||10,item.sortOrder||0]);
    res.status(201).json(exam.rows[0]);
  }catch(e){res.status(500).json({error:e.message})}
});
ex.put('/:id',auth,async(req,res)=>{
  try{
    const{title,type,weaponId}=req.body;
    const{rows}=await db.query('UPDATE exams SET title=$1,type=$2,weapon_id=$3 WHERE id=$4 RETURNING *',[title,type,weaponId||null,req.params.id]);
    if(!rows.length) return res.status(404).json({error:'غير موجود'});
    res.json(rows[0]);
  }catch(e){res.status(500).json({error:e.message})}
});
ex.delete('/:id',auth,commanderOnly,async(req,res)=>{
  try{
    await db.query('DELETE FROM exam_items WHERE exam_id=$1',[req.params.id]);
    const{rowCount}=await db.query('DELETE FROM exams WHERE id=$1',[req.params.id]);
    if(!rowCount) return res.status(404).json({error:'غير موجود'});
    res.json({message:'تم الحذف'});
  }catch(e){res.status(500).json({error:e.message})}
});
app.use('/api/exams',ex);

// RESULTS with three scores + notifications
const rs=express.Router();
rs.get('/',auth,async(req,res)=>{
  try{
    const{type,weaponId,soldierId,page=1,limit=30}=req.query;
    const offset=(parseInt(page)-1)*parseInt(limit);
    const{rows}=await db.query("SELECT r.*,s.name soldier_name,s.military_id,e.title exam_title,e.type exam_type,u.name entered_by_name,COUNT(*)OVER()as total_count FROM results r JOIN soldiers s ON s.id=r.soldier_id LEFT JOIN exams e ON e.id=r.exam_id LEFT JOIN users u ON u.id=r.entered_by WHERE($1::text IS NULL OR r.result_type=$1::text)AND($2::uuid IS NULL OR s.weapon_id=$2::uuid)AND($3::uuid IS NULL OR r.soldier_id=$3::uuid) ORDER BY r.created_at DESC LIMIT $4 OFFSET $5",[type||null,weaponId||null,soldierId||null,parseInt(limit),offset]);
    const total=rows.length?parseInt(rows[0].total_count):0;
    res.json({results:rows,total,page:parseInt(page),limit:parseInt(limit)});
  }catch(e){res.status(500).json({error:e.message})}
});
rs.get('/stats',auth,async(req,res)=>{
  try{
    const counts=await db.query("SELECT (SELECT COUNT(*)FROM soldiers)total_soldiers,(SELECT COUNT(*)FROM results)total_results,COALESCE(ROUND((SELECT AVG(total_score)FROM results),1),0)avg_score,COALESCE(ROUND((SELECT COUNT(*)FROM results WHERE total_score>=50)*100.0/NULLIF((SELECT COUNT(*)FROM results),0),1),0)pass_rate,COALESCE(ROUND((SELECT AVG(fitness_score)FROM results),1),0)avg_fitness,COALESCE(ROUND((SELECT AVG(specialty_score)FROM results),1),0)avg_specialty,COALESCE(ROUND((SELECT AVG(discipline_score)FROM results),1),0)avg_discipline");
    const byWeapon=await db.query("SELECT w.name weapon_name,w.icon weapon_icon,COUNT(r.id)::int count,ROUND(AVG(r.total_score),1)avg,COALESCE(ROUND(COUNT(CASE WHEN r.total_score>=50 THEN 1 END)*100.0/NULLIF(COUNT(r.id),0),1),0)pass_rate FROM weapons w LEFT JOIN soldiers s ON s.weapon_id=w.id LEFT JOIN results r ON r.soldier_id=s.id GROUP BY w.id,w.name,w.icon ORDER BY count DESC");
    const distribution=await db.query("SELECT COUNT(CASE WHEN total_score>=90 THEN 1 END)::int excellent,COUNT(CASE WHEN total_score>=75 AND total_score<90 THEN 1 END)::int very_good,COUNT(CASE WHEN total_score>=65 AND total_score<75 THEN 1 END)::int good,COUNT(CASE WHEN total_score>=50 AND total_score<65 THEN 1 END)::int acceptable,COUNT(CASE WHEN total_score<50 THEN 1 END)::int fail FROM results");
    const recent=await db.query("SELECT r.*,s.name soldier_name,s.military_id,s.distinction_badge,e.title exam_title FROM results r JOIN soldiers s ON s.id=r.soldier_id LEFT JOIN exams e ON e.id=r.exam_id ORDER BY r.created_at DESC LIMIT 8");
    const c=counts.rows[0],d=distribution.rows[0];
    res.json({
      totalSoldiers:Number(c.total_soldiers),totalResults:Number(c.total_results),
      avgScore:Number(c.avg_score),passRate:Number(c.pass_rate),
      avgFitness:Number(c.avg_fitness),avgSpecialty:Number(c.avg_specialty),avgDiscipline:Number(c.avg_discipline),
      byWeapon:byWeapon.rows.map(r=>({...r,count:Number(r.count),avg:Number(r.avg),pass_rate:Number(r.pass_rate)})),
      distribution:{excellent:Number(d.excellent),veryGood:Number(d.very_good),good:Number(d.good),acceptable:Number(d.acceptable),fail:Number(d.fail)},
      recentResults:recent.rows.map(r=>({...r,total_score:cn(r.total_score),fitness_score:cn(r.fitness_score),specialty_score:cn(r.specialty_score),discipline_score:cn(r.discipline_score)})),
    });
  }catch(e){res.status(500).json({error:e.message})}
});
rs.get('/:id',auth,async(req,res)=>{
  try{
    const result=await db.query("SELECT r.*,s.name soldier_name,s.military_id,s.distinction_badge,e.title exam_title,e.type exam_type,u.name entered_by_name FROM results r JOIN soldiers s ON s.id=r.soldier_id LEFT JOIN exams e ON e.id=r.exam_id LEFT JOIN users u ON u.id=r.entered_by WHERE r.id=$1",[req.params.id]);
    if(!result.rows.length) return res.status(404).json({error:'غير موجود'});
    const scores=await db.query('SELECT ris.*,ei.text item_text,ei.max_score FROM result_item_scores ris LEFT JOIN exam_items ei ON ei.id=ris.item_id WHERE ris.result_id=$1',[req.params.id]);
    res.json({...result.rows[0],scores:scores.rows});
  }catch(e){res.status(500).json({error:e.message})}
});
rs.post('/',auth,async(req,res)=>{
  try{
    const{examId,soldierId,fitnessScore,specialtyScore,disciplineScore,totalScore,notes,resultType,examDate}=req.body;
    if(!examId||!soldierId) return res.status(400).json({error:'يرجى إدخال البيانات المطلوبة'});
    const fs=cn(fitnessScore),ss=cn(specialtyScore),ds=cn(disciplineScore);
    const total=totalScore!=null?cn(totalScore):[fs,ss,ds].every(s=>s!=null)?Math.round((fs+ss+ds)/3*100)/100:null;
    const result=await db.query('INSERT INTO results(exam_id,soldier_id,result_type,total_score,fitness_score,specialty_score,discipline_score,notes,exam_date,entered_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *',[examId,soldierId,resultType||'exam',total,fs,ss,ds,notes||null,examDate||new Date().toISOString().split('T')[0],req.user.id]);
    // Create notification for commander if evaluated by lower rank
    if(req.user.role!=='commander'){
      const s=await db.query("SELECT s.name sname,r.name srank,sp.name sspec,w.name sweapon FROM soldiers s LEFT JOIN ranks r ON r.id=s.rank_id LEFT JOIN specialties sp ON sp.id=s.specialty_id LEFT JOIN weapons w ON w.id=s.weapon_id WHERE s.id=$1",[soldierId]);
      if(s.rows.length){
        const sr=s.rows[0];
        let msg=`${req.user.name} (${req.user.role}) قام بتقييم ${sr.sname}`;
        await db.query('INSERT INTO notifications(type,message,evaluator_id,evaluator_name,evaluator_rank,evaluator_weapon,evaluated_id,evaluated_name,evaluated_rank,evaluated_specialty,fitness_score,specialty_score,discipline_score,total_score) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)',['evaluation',msg,req.user.id,req.user.name,req.user.role,'',soldierId,sr.sname,sr.srank||'',sr.sspec||'',fs,ss,ds,total]);
      }
    }
    res.status(201).json(result.rows[0]);
  }catch(e){res.status(500).json({error:e.message})}
});
rs.delete('/:id',auth,commanderOnly,async(req,res)=>{
  try{
    const{rowCount}=await db.query('DELETE FROM results WHERE id=$1',[req.params.id]);
    if(!rowCount) return res.status(404).json({error:'غير موجود'});
    res.json({message:'تم الحذف'});
  }catch(e){res.status(500).json({error:e.message})}
});
app.use('/api/results',rs);

// FITNESS
const ft=express.Router();
ft.get('/exercises',auth,async(req,res)=>{try{const{rows}=await db.query('SELECT * FROM fitness_exercises ORDER BY name');res.json(rows)}catch(e){res.status(500).json({error:e.message})}});
ft.post('/exercises',auth,commanderOnly,async(req,res)=>{
  try{
    if(!req.body.name) return res.status(400).json({error:'يرجى إدخال الاسم'});
    const{rows}=await db.query('INSERT INTO fitness_exercises(name,unit,higher_is_better,pass_mark)VALUES($1,$2,$3,$4)RETURNING *',[req.body.name,req.body.unit||null,req.body.higherIsBetter!==false,req.body.passMark||60]);
    res.status(201).json(rows[0]);
  }catch(e){res.status(500).json({error:e.message})}
});
ft.put('/exercises/:id',auth,commanderOnly,async(req,res)=>{
  try{
    const{rows}=await db.query('UPDATE fitness_exercises SET name=$1,unit=$2,higher_is_better=$3,pass_mark=$4 WHERE id=$5 RETURNING *',[req.body.name,req.body.unit,req.body.higherIsBetter,req.body.passMark,req.params.id]);
    if(!rows.length) return res.status(404).json({error:'غير موجود'});res.json(rows[0]);
  }catch(e){res.status(500).json({error:e.message})}
});
ft.delete('/exercises/:id',auth,commanderOnly,async(req,res)=>{
  try{
    const{rowCount}=await db.query('DELETE FROM fitness_exercises WHERE id=$1',[req.params.id]);
    if(!rowCount) return res.status(404).json({error:'غير موجود'});res.json({message:'تم الحذف'});
  }catch(e){res.status(500).json({error:e.message})}
});
ft.post('/results',auth,async(req,res)=>{
  try{
    const{soldierId,results,notes,examDate}=req.body;
    if(!soldierId||!results?.length) return res.status(400).json({error:'يرجى إدخال البيانات'});
    if(!await canEvaluate(req.user.id,soldierId)&&req.user.role!=='commander') return res.status(403).json({error:'لا يمكنك تقييم هذا الفرد'});
    const client=await pool.connect();
    try{
      await client.query('BEGIN');
      const fitEx=await db.query('SELECT id,pass_mark FROM fitness_exercises ORDER BY id');
      let totalPct=0;
      for(const ex of fitEx.rows){const r=results.find(x=>x.exerciseId===ex.id);if(r){const val=parseFloat(r.value)||0;const pct=ex.pass_mark>0?Math.min(100,(val/ex.pass_mark)*100):0;totalPct+=pct;await client.query('INSERT INTO fitness_results(soldier_id,exercise_id,score_value,score_percent)VALUES($1,$2,$3,$4)',[soldierId,ex.id,val,Math.round(pct*100)/100]);}}
      const avg=fitEx.rows.length>0?Math.round((totalPct/fitEx.rows.length)*100)/100:0;
      await client.query('INSERT INTO results(exam_id,soldier_id,result_type,total_score,fitness_score,notes,exam_date,entered_by)VALUES(NULL,$1,$2,$3,$4,$5,$6,$7)',[soldierId,'fitness',avg,avg,notes||null,examDate||new Date().toISOString().split('T')[0],req.user.id]);
      await client.query('COMMIT');
      res.status(201).json({message:'تم الحفظ',totalScore:avg});
    }catch(e){await client.query('ROLLBACK');throw e}finally{client.release()}
  }catch(e){res.status(500).json({error:e.message})}
});
app.use('/api/fitness',ft);

// ANNOUNCEMENTS
const an=express.Router();
an.get('/',auth,async(req,res)=>{
  try{const{rows}=await db.query("SELECT a.*,u.name created_by_name FROM announcements a LEFT JOIN users u ON u.id=a.created_by ORDER BY a.created_at DESC");res.json(rows)}
  catch(e){res.status(500).json({error:e.message})}
});
an.post('/',auth,async(req,res)=>{
  try{
    const{title,body,priority}=req.body;
    if(!title) return res.status(400).json({error:'يرجى إدخال العنوان'});
    const{rows}=await db.query('INSERT INTO announcements(title,body,priority,created_by)VALUES($1,$2,$3,$4)RETURNING *',[title,body||null,priority||'normal',req.user.id]);
    // Notify commander
    if(req.user.role!=='commander'){
      await db.query("INSERT INTO notifications(type,message,evaluator_id,evaluator_name,evaluated_name)VALUES('announcement',$1,$2,$3,'')",[`إعلان جديد: ${title}`,req.user.id,req.user.name]);
    }
    res.status(201).json(rows[0]);
  }catch(e){res.status(500).json({error:e.message})}
});
an.delete('/:id',auth,commanderOnly,async(req,res)=>{
  try{const{rowCount}=await db.query('DELETE FROM announcements WHERE id=$1',[req.params.id]);if(!rowCount)return res.status(404).json({error:'غير موجود'});res.json({message:'تم الحذف'})}
  catch(e){res.status(500).json({error:e.message})}
});
app.use('/api/announcements',an);

// NOTIFICATIONS
const nt=express.Router();
nt.get('/',auth,async(req,res)=>{
  try{
    const{rows}=await db.query('SELECT * FROM notifications ORDER BY created_at DESC LIMIT 50');
    res.json(rows);
  }catch(e){res.status(500).json({error:e.message})}
});
nt.patch('/:id/read',auth,async(req,res)=>{
  try{await db.query("UPDATE notifications SET is_read=true WHERE id=$1",[req.params.id]);res.json({message:'ok'})}
  catch(e){res.status(500).json({error:e.message})}
});
nt.patch('/read-all',auth,async(req,res)=>{
  try{await db.query("UPDATE notifications SET is_read=true WHERE is_read=false");res.json({message:'ok'})}
  catch(e){res.status(500).json({error:e.message})}
});
nt.get('/unread-count',auth,async(req,res)=>{
  try{const{rows}=await db.query("SELECT COUNT(*)::int count FROM notifications WHERE is_read=false");res.json({count:rows[0].count})}
  catch(e){res.status(500).json({error:e.message})}
});
app.use('/api/notifications',nt);

// USERS
const us=express.Router();
us.get('/',auth,commanderOnly,async(req,res)=>{
  try{const{rows}=await db.query("SELECT id,name,username,role,is_active,created_at,r.name rank_name FROM users u LEFT JOIN ranks r ON r.id=u.rank_id ORDER BY u.created_at");res.json(rows)}
  catch(e){res.status(500).json({error:e.message})}
});
us.post('/',auth,commanderOnly,async(req,res)=>{
  try{
    const{name,username,password,role,rankId}=req.body;
    if(!name||!username||!password) return res.status(400).json({error:'يرجى إدخال البيانات'});
    const hash=await bcrypt.hash(password,10);
    await db.query('INSERT INTO users(name,username,password_hash,role,rank_id)VALUES($1,$2,$3,$4,$5)',[name,username,hash,role||'officer',rankId||null]);
    res.status(201).json({message:'تم الإنشاء'});
  }catch(e){res.status(500).json({error:e.message})}
});
us.patch('/:id/password',auth,commanderOnly,async(req,res)=>{
  try{if(!req.body.password)return res.status(400).json({error:'يرجى إدخال كلمة المرور'});
    await db.query('UPDATE users SET password_hash=$1 WHERE id=$2',[await bcrypt.hash(req.body.password,10),req.params.id]);
    res.json({message:'تم التغيير'});
  }catch(e){res.status(500).json({error:e.message})}
});
us.patch('/:id/toggle',auth,commanderOnly,async(req,res)=>{
  try{const{rows}=await db.query('UPDATE users SET is_active=NOT is_active WHERE id=$1 RETURNING is_active',[req.params.id]);
    if(!rows.length)return res.status(404).json({error:'غير موجود'});
    res.json({isActive:rows[0].is_active,message:rows[0].is_active?'تم التفعيل':'تم التعطيل'});
  }catch(e){res.status(500).json({error:e.message})}
});
us.delete('/:id',auth,commanderOnly,async(req,res)=>{
  try{const{rowCount}=await db.query('DELETE FROM users WHERE id=$1',[req.params.id]);if(!rowCount)return res.status(404).json({error:'غير موجود'});res.json({message:'تم الحذف'})}
  catch(e){res.status(500).json({error:e.message})}
});
app.use('/api/users',us);

app.use((err,req,res,next)=>{
  console.error('Unhandled:',err);
  res.status(500).json({error:'حدث خطأ غير متوقع'});
});
exports.handler=serverless(app);
