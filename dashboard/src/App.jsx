import React,{useState,useEffect,useCallback,useRef} from 'react';
import {api} from './api';
import './styles.css';

const S={bg:'#0A0F07',card:'#111A0A',border:'#1E2D14',gold:'#C9A84C',text:'#F5F5DC',text2:'#9CAF88',green:'#2C3E2E',sand:'#D4C9A8',red:'#B22222',hdGold:'#FFD700',danger:'#E63946',success:'#2D6A4F'};

function toPct(v){return v!=null?Number(v).toFixed(1):'-'}

export default function App(){
  const[u,setU]=useState(null);
  const[token,setToken]=useState(localStorage.getItem('b20_token'));
  const[page,setPage]=useState('login');
  const[data,setData]=useState({stats:null,soldiers:[],exams:[],results:[],weapons:[],specialties:[],rankTypes:[],ranks:[],announcements:[],users:[],notifications:[]});
  const[loading,setLoading]=useState(false);
  const[tab,setTab]=useState('dashboard');
  const[notifOpen,setNotifOpen]=useState(false);
  const[selectedSoldier,setSelectedSoldier]=useState(null);
  const[distinguishModal,setDistinguishModal]=useState(null);

  const load=useCallback(async()=>{
    setLoading(true);
    try{
      const[s,sold,ex,res,wp,sp,rt,rk,ann,notif]=await Promise.all([
        api.getStats().catch(()=>null),
        api.getSoldiers({}).catch(()=>[]),
        api.getExams({}).catch(()=>[]),
        api.getResults({}).catch(()=>({results:[]})),
        api.getWeapons().catch(()=>[]),
        api.getSpecialties().catch(()=>[]),
        api.getRankTypes().catch(()=>[]),
        api.getRanks().catch(()=>[]),
        api.getAnnouncements().catch(()=>[]),
        api.getNotifications().catch(()=>[]),
      ]);
      const newData={stats:s,soldiers:sold,exams:ex,results:res.results||[],weapons:wp,specialties:sp,rankTypes:rt,ranks:rk,announcements:ann,users:[],notifications:notif};
      setData(newData);
    }catch(e){console.error(e)}
    setLoading(false);
  },[]);

  useEffect(()=>{
    if(token){loadUser();load()}
  },[token]);

  // Auto-refresh notifications every 10s
  useEffect(()=>{
    if(!token)return;
    const iv=setInterval(async()=>{
      try{const n=await api.getNotifications();setData(d=>({...d,notifications:n}))}catch(e){}
    },10000);
    return ()=>clearInterval(iv);
  },[token]);

  async function loadUser(){
    try{const u2=await api.me();setU(u2);if(page==='login')setPage('dashboard')}
    catch{localStorage.removeItem('b20_token');setToken(null);setU(null);setPage('login')}
  }

  function handleLogin(username,password){
    api.login(username,password).then(({token:t,user:u2})=>{localStorage.setItem('b20_token',t);setToken(t);setU(u2);setPage('dashboard')}).catch(e=>alert(e.message));
  }

  function handleLogout(){localStorage.removeItem('b20_token');setToken(null);setU(null);setPage('login')}

  async function markRead(id){
    await api.markNotificationRead(id);
    setData(d=>({...d,notifications:d.notifications.map(n=>n.id===id?{...n,is_read:true}:n)}));
  }

  async function markAllRead(){
    await api.markAllNotificationsRead();
    setData(d=>({...d,notifications:d.notifications.map(n=>({...n,is_read:true}))}));
  }

  async function handleDistinguish(soldierId,badge,citation){
    try{await api.distinguishSoldier(soldierId,badge,citation);setDistinguishModal(null);setSelectedSoldier(null);load()}
    catch(e){alert(e.message)}
  }

  async function removeDistinction(soldierId){
    try{await api.removeDistinction(soldierId);load()}catch(e){alert(e.message)}
  }

  const unread=data.notifications.filter(n=>!n.is_read).length;

  if(page==='login') return <LoginPage onLogin={handleLogin}/>;

  return(
    <div className="app">
      <Sidebar tab={tab} onTab={setTab} user={u} onLogout={handleLogout} unread={unread} onNotif={()=>setNotifOpen(o=>!o)}/>
      <div className={`notif-rail ${notifOpen?'open':''}`}>
        <NotificationPanel notifications={data.notifications} onMarkRead={markRead} onMarkAll={markAllRead}
          onSoldierClick={id=>{const s=data.soldiers.find(x=>x.id===id);if(s){setSelectedSoldier(s);setNotifOpen(false)}}}/>
      </div>
      <main className="main">
        {tab==='dashboard'&&<DashboardPage stats={data.stats} loading={loading} soldiers={data.soldiers} onRefresh={load}
          onDistinguish={s=>setDistinguishModal(s)} onSoldierClick={s=>setSelectedSoldier(s)}/>}
        {tab==='soldiers'&&<SoldiersPage soldiers={data.soldiers} weapons={data.weapons} specialties={data.specialties} ranks={data.ranks} rankTypes={data.rankTypes} onRefresh={load} user={u}
          onDistinguish={s=>setDistinguishModal(s)} onSoldierClick={s=>setSelectedSoldier(s)}/>}
        {tab==='exams'&&<ExamsPage exams={data.exams} weapons={data.weapons} onRefresh={load} user={u}/>}
        {tab==='results'&&<ResultsPage results={data.results} soldiers={data.soldiers} exams={data.exams} onRefresh={load} user={u}
          onSoldierClick={s=>{const found=data.soldiers.find(x=>x.id===s);if(found)setSelectedSoldier(found)}}/>}
        {tab==='notifications'&&<NotificationPage notifications={data.notifications} onMarkRead={markRead} onMarkAll={markAllRead}
          onSoldierClick={id=>{const s=data.soldiers.find(x=>x.id===id);if(s){setSelectedSoldier(s)}}}/>}
        {tab==='announcements'&&<AnnouncementsPage announcements={data.announcements} onRefresh={load} user={u}/>}
      </main>
      {selectedSoldier&&<SoldierProfile soldier={selectedSoldier} onClose={()=>setSelectedSoldier(null)} onDistinguish={s=>{setDistinguishModal(s);setSelectedSoldier(null)}} onRemoveDistinction={removeDistinction} user={u} ranks={data.ranks} weapons={data.weapons} specialties={data.specialties}/>}
      {distinguishModal&&<DistinguishModal soldier={distinguishModal} onClose={()=>setDistinguishModal(null)} onConfirm={handleDistinguish}/>}
    </div>
  );
}

function LoginPage({onLogin}){
  const[u,setU]=useState('');const[p,setP]=useState('');const[ld,setLd]=useState(false);
  async function h(e){e.preventDefault();setLd(true);try{await onLogin(u,p)}catch{}setLd(false)}
  return(<div className="login-page"><div className="login-card"><div className="login-icon">🛡️</div><h1>كتيبة 20</h1><p className="login-sub">نظام التقييم العسكري</p><form onSubmit={h}><input placeholder="اسم المستخدم" value={u} onChange={e=>setU(e.target.value)} className="inp" style={{marginBottom:12}}/><input type="password" placeholder="كلمة المرور" value={p} onChange={e=>setP(e.target.value)} className="inp" style={{marginBottom:24}}/><button type="submit" disabled={ld} className="btn-primary" style={{width:'100%'}}>{ld?'جاري...':'تسجيل الدخول'}</button></form></div></div>);
}

function Sidebar({tab,onTab,user,onLogout,unread,onNotif}){
  const tabs=[
    {id:'dashboard',label:'الرئيسية',icon:'📊'},
    {id:'soldiers',label:'الأفراد',icon:'👥'},
    {id:'exams',label:'الامتحانات',icon:'📝'},
    {id:'results',label:'النتائج',icon:'🏆'},
    {id:'notifications',label:'الإشعارات',icon:'🔔',badge:unread},
    {id:'announcements',label:'الإعلانات',icon:'📢'},
  ];
  const[open,setOpen]=useState(false);
  return(<>
    <button className="menu-toggle" onClick={()=>setOpen(o=>!o)}>☰</button>
    <aside className={`sidebar ${open?'open':''}`}>
      <div className="sidebar-header"><div className="sidebar-logo">🛡️</div><h2>كتيبة 20</h2><div className="sidebar-user">{user?.name}</div></div>
      <nav className="sidebar-nav">
        {tabs.map(t=><button key={t.id} onClick={()=>{onTab(t.id);setOpen(false)}} className={`sidebar-btn ${tab===t.id?'active':''}`}>
          <span className="sidebar-btn-icon">{t.icon}</span>
          <span className="sidebar-btn-label">{t.label}</span>
          {t.badge>0&&<span className="badge-dot">{t.badge}</span>}
        </button>)}
      </nav>
      <div className="sidebar-spacer"/>
      <button onClick={onLogout} className="sidebar-btn logout"><span className="sidebar-btn-icon">🚪</span><span className="sidebar-btn-label">تسجيل الخروج</span></button>
    </aside>
    {open&&<div className="sidebar-overlay" onClick={()=>setOpen(false)}/>}</>
  );
}

function DashboardPage({stats,loading,soldiers,onRefresh,onDistinguish,onSoldierClick}){
  if(loading||!stats) return <div className="loading">جاري تحميل البيانات...</div>;
  const dist=stats.distribution||{};
  const totalDist=['excellent','veryGood','good','acceptable','fail'].reduce((s,k)=>s+(dist[k]||0),0);
  const recent=stats.recentResults||[];
  const distinguished=soldiers.filter(s=>s.distinction_badge);

  return(<div className="dashboard">
    <div className="page-header"><h1>لوحة القيادة</h1><button onClick={onRefresh} className="btn-outline">🔄 تحديث</button></div>

    <div className="stats-grid">
      {[['الأفراد',stats.totalSoldiers,'👥',S.gold],['النتائج',stats.totalResults,'🏆',S.success],['المعدل',`${stats.avgScore}%`,'📈','#4FC3F7'],['النجاح',`${stats.passRate}%`,'✅','#66BB6A']].map(([l,v,i,c])=>
        <div key={l} className="stat-card"><div className="stat-icon">{i}</div><div className="stat-value" style={{color:c}}>{v}</div><div className="stat-label">{l}</div></div>
      )}
    </div>

    <div className="three-scores">
      {[['اللياقة',stats.avgFitness],['التخصص',stats.avgSpecialty],['الانضباط',stats.avgDiscipline]].map(([l,v])=>
        <div key={l} className="score-card"><div className="score-label">{l}</div><div className="score-val">{v!=null?`${Number(v).toFixed(1)}%`:'-'}</div></div>
      )}
    </div>

    {distinguished.length>0&&<div className="section">
      <h2 className="section-title">⭐ الأفراد المميزون</h2>
      <div className="soldier-grid">
        {distinguished.map(s=><SoldierCard key={s.id} soldier={s} onDistinguish={onDistinguish} onClick={onSoldierClick}/>)}
      </div>
    </div>}

    <div className="two-col">
      <div className="section"><h2 className="section-title">توزيع الدرجات</h2>
        {totalDist>0?['excellent','veryGood','good','acceptable','fail'].map(k=>{
          const lbs={excellent:'ممتاز',veryGood:'جيد جداً',good:'جيد',acceptable:'مقبول',fail:'راسب'};
          const cs={excellent:'#1B8A2E',veryGood:'#2D6A4F',good:S.gold,acceptable:'#E9C46A',fail:S.danger};
          const pct=totalDist>0?((dist[k]||0)/totalDist*100).toFixed(1):0;
          return(<div key={k} className="dist-item"><div className="dist-label"><span>{lbs[k]}</span><span style={{color:cs[k]}}>{dist[k]||0} ({pct}%)</span></div><div className="dist-bar"><div className="dist-fill" style={{width:`${pct}%`,background:cs[k]}}/></div></div>);
        }):<div className="empty">لا توجد نتائج بعد</div>}
      </div>
      <div className="section"><h2 className="section-title">حسب السلاح</h2>
        {(stats.byWeapon||[]).map(w=><div key={w.weapon_name} className="weapon-row"><span className="weapon-icon">{w.weapon_icon||'⚔️'}</span><div className="weapon-info"><div className="weapon-name">{w.weapon_name}</div><div className="weapon-count">{w.count} فرد</div></div><ScoreBadge score={w.avg}/></div>)}
      </div>
    </div>

    <div className="section"><h2 className="section-title">آخر النتائج</h2>
      {recent.map(r=><div key={r.id} className="result-row" onClick={()=>{const s=soldiers.find(x=>x.id===r.soldier_id);if(s)onSoldierClick(s)}}>
        <div className="result-info"><div className="result-name">{r.soldier_name}{r.distinction_badge?<span className="star-icon">⭐</span>:''}</div><div className="result-exam">{r.exam_title||''}</div></div>
        {r.fitness_score!=null&&<div className="result-scores"><span className="mini-score" title="لياقة">{Number(r.fitness_score).toFixed(0)}</span><span className="mini-score" title="تخصص">{Number(r.specialty_score).toFixed(0)}</span><span className="mini-score" title="انضباط">{Number(r.discipline_score).toFixed(0)}</span></div>}
        <ScoreBadge score={r.total_score}/>
      </div>)}
    </div>
  </div>);
}

function SoldierCard({soldier:s,onDistinguish,onClick}){
  const isGold=s.distinction_badge==='gold';
  return(<div className={`soldier-card ${isGold?'gold-border':''} ${s.distinction_badge?'distinguished':''}`} onClick={()=>onClick(s)}>
    {s.distinction_badge&&<div className="distinction-star">⭐</div>}
    <div className="soldier-card-rank">{s.rank_name||'جندي'}</div>
    <div className="soldier-card-name">{s.name}</div>
    <div className="soldier-card-weapon">{s.weapon_icon||'👤'} {s.weapon_name||''}</div>
    <div className="soldier-card-spec">{s.specialty_name||''}{s.specific_specialty?` • ${s.specific_specialty}`:''}</div>
    <div className="soldier-card-badges">
      <span className={`badge-${s.distinction_badge||'none'}`}>{s.distinction_badge?`${s.distinction_badge==='gold'?'🥇':s.distinction_badge==='silver'?'🥈':'🥉'} مميز`:''}</span>
    </div>
    {onDistinguish&&<button className="btn-distinguish" onClick={e=>{e.stopPropagation();onDistinguish(s)}}>🎖️ تمييز</button>}
  </div>);
}

function ScoreBadge({score,size}){
  if(score==null)return null;
  const v=Number(score);
  const c=v>=90?'#1B8A2E':v>=75?'#2D6A4F':v>=65?S.gold:v>=50?'#E9C46A':S.danger;
  const l=v>=90?'ممتاز':v>=75?'جيد جداً':v>=65?'جيد':v>=50?'مقبول':'راسب';
  const fs=size||12;
  return<span className="score-badge" style={{background:`${c}30`,color:c,border:`1px solid ${c}80`,fontSize:fs}}>{l} {v.toFixed(1)}%</span>;
}

function SoldiersPage({soldiers,weapons,specialties,ranks,rankTypes,onRefresh,user,onDistinguish,onSoldierClick}){
  const[search,setSearch]=useState('');const[weaponFilter,setWeaponFilter]=useState('');
  const[editSoldier,setEditSoldier]=useState(null);
  const filtered=soldiers.filter(s=>{if(search&&!s.name.includes(search)&&!s.military_id?.includes(search))return false;if(weaponFilter&&s.weapon_id!==weaponFilter)return false;return true});

  return(<div>
    <div className="page-header"><h1>الأفراد</h1><button onClick={()=>setEditSoldier({})} className="btn-primary">+ إضافة جندي</button></div>
    <div className="filters"><input placeholder="بحث بالاسم أو الرقم..." value={search} onChange={e=>setSearch(e.target.value)} className="inp" style={{flex:1}}/>
      <select value={weaponFilter} onChange={e=>setWeaponFilter(e.target.value)} className="inp" style={{width:160}}><option value="">الكل</option>{weapons.map(w=><option key={w.id} value={w.id}>{w.icon} {w.name}</option>)}</select></div>

    {/* Mobile: card grid */}
    <div className="soldier-grid">
      {filtered.map(s=><SoldierCard key={s.id} soldier={s} onDistinguish={user?.role==='commander'?onDistinguish:null} onClick={onSoldierClick}/>)}
    </div>

    {/* Desktop: data table */}
    <div className="data-table-wrap">
      <table className="data-table">
        <thead><tr><th>الرتبة</th><th>الاسم</th><th>السلاح</th><th>التخصص العام</th><th>التخصص الدقيق</th><th>اللياقة</th><th>التخصص</th><th>الانضباط</th><th>المجموع</th><th>الوسام</th><th></th></tr></thead>
        <tbody>{filtered.map(s=>{
          const last=s.last_result||{};
          return(<tr key={s.id} className={s.distinction_badge?'distinguished-row':''} onClick={()=>onSoldierClick(s)}>
            <td><span className="rank-badge" style={{background:s.rank_color?`${s.rank_color}30`:S.border,color:s.rank_color||S.text}}>{s.rank_name||'-'}</span></td>
            <td>{s.name}{s.distinction_badge?'⭐':''}</td>
            <td>{s.weapon_icon||''} {s.weapon_name||'-'}</td>
            <td>{s.specialty_name||'-'}</td>
            <td>{s.specific_specialty||'-'}</td>
            <td>{last.fitness_score!=null?`${Number(last.fitness_score).toFixed(0)}`:'-'}</td>
            <td>{last.specialty_score!=null?`${Number(last.specialty_score).toFixed(0)}`:'-'}</td>
            <td>{last.discipline_score!=null?`${Number(last.discipline_score).toFixed(0)}`:'-'}</td>
            <td>{last.total_score!=null?<ScoreBadge score={last.total_score} size={11}/>:'-'}</td>
            <td>{s.distinction_badge?<span className={`badge-${s.distinction_badge}`} title={s.distinction_citation||'مميز'}>🥇</span>:'-'}</td>
            <td>{user?.role==='commander'&&<button className="btn-sm" onClick={e=>{e.stopPropagation();onDistinguish(s)}}>🎖️</button>}</td>
          </tr>)
        })}</tbody>
      </table>
    </div>

    {editSoldier!=null&&<SoldierForm soldier={editSoldier} weapons={weapons} specialties={specialties} ranks={ranks} rankTypes={rankTypes} onClose={()=>{setEditSoldier(null);onRefresh()}}/>}
  </div>);
}

function SoldierForm({soldier,weapons,specialties:allSpecialties,ranks,rankTypes,onClose}){
  const[name,setName]=useState(soldier.name||'');const[mId,setMId]=useState(soldier.military_id||'');
  const[wId,setWId]=useState(soldier.weapon_id||'');const[spId,setSpId]=useState(soldier.specialty_id||'');
  const[spSpec,setSpSpec]=useState(soldier.specific_specialty||'');
  const[rId,setRId]=useState(soldier.rank_id||'');const[notes,setNotes]=useState(soldier.notes||'');
  const[specs,setSpecs]=useState(allSpecialties);
  useEffect(()=>{if(wId)api.getSpecialties(wId).then(setSpecs).catch(()=>{})},[wId]);
  async function save(){
    try{if(soldier.id)await api.updateSoldier(soldier.id,{name,militaryId:mId,rankId:rId,weaponId:wId,specialtyId:spId,specificSpecialty:spSpec,notes});else await api.createSoldier({name,militaryId:mId,rankId:rId,weaponId:wId,specialtyId:spId,specificSpecialty:spSpec,notes});onClose()}
    catch(e){alert(e.message)}
  }
  return(<Modal onClose={onClose}><h2>{soldier.id?'تعديل جندي':'إضافة جندي'}</h2>
    <input placeholder="الاسم" value={name} onChange={e=>setName(e.target.value)} className="inp" style={{marginBottom:8}}/>
    <input placeholder="الرقم العسكري" value={mId} onChange={e=>setMId(e.target.value)} className="inp" style={{marginBottom:8}}/>
    <select value={wId} onChange={e=>setWId(e.target.value)} className="inp" style={{marginBottom:8}}><option value="">اختر السلاح</option>{weapons.map(w=><option key={w.id} value={w.id}>{w.icon} {w.name}</option>)}</select>
    <select value={spId} onChange={e=>setSpId(e.target.value)} className="inp" style={{marginBottom:8}}><option value="">اختر التخصص العام</option>{specs.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select>
    <input placeholder="التخصص الدقيق (مثال: صيانة أسلحة ثقيلة)" value={spSpec} onChange={e=>setSpSpec(e.target.value)} className="inp" style={{marginBottom:8}}/>
    <select value={rId} onChange={e=>setRId(e.target.value)} className="inp" style={{marginBottom:8}}><option value="">اختر الرتبة</option>{ranks.map(r=><option key={r.id} value={r.id}>{r.name}</option>)}</select>
    <textarea placeholder="ملاحظات" value={notes} onChange={e=>setNotes(e.target.value)} rows={3} className="inp" style={{marginBottom:16}}/>
    <div className="btn-row"><button onClick={save} className="btn-primary" style={{flex:1}}>حفظ</button><button onClick={onClose} className="btn-secondary" style={{flex:1}}>إلغاء</button></div>
  </Modal>);
}

function ExamsPage({exams,weapons,onRefresh,user}){
  const[typeFilter,setTypeFilter]=useState('');const[showForm,setShowForm]=useState(false);
  const filtered=exams.filter(e=>!typeFilter||e.type===typeFilter);
  return(<div>
    <div className="page-header"><h1>الامتحانات</h1>{user?.role==='commander'&&<button onClick={()=>setShowForm(true)} className="btn-primary">+ إنشاء امتحان</button>}</div>
    <select value={typeFilter} onChange={e=>setTypeFilter(e.target.value)} className="inp" style={{marginBottom:16,width:200}}><option value="">الكل</option><option value="general">عام</option><option value="weapon">سلاح</option><option value="specialty">تخصص</option></select>
    <div className="soldier-grid">{filtered.map(e=><div key={e.id} className="soldier-card" style={{cursor:'default'}}><div className="soldier-card-name">{e.title}</div><div className="soldier-card-spec">{e.type} • {e.item_count} بند • {e.result_count} نتيجة</div>{e.avg_score!=null&&<div style={{marginTop:8}}><ScoreBadge score={e.avg_score}/></div>}</div>)}
    </div>
    {showForm&&<ExamForm weapons={weapons} onClose={()=>{setShowForm(false);onRefresh()}}/>}
  </div>);
}

function ExamForm({weapons,onClose}){
  const[title,setTitle]=useState('');const[type,setType]=useState('general');const[weaponId,setWeaponId]=useState('');const[itemsText,setItemsText]=useState('');
  async function save(){
    const items=itemsText.split('\n').filter(l=>l.trim()).map(l=>{const p=l.split('|');return{text:p[0].trim(),maxScore:parseFloat(p[1])||10}});
    if(!title||!items.length)return;
    try{await api.createExam({title,type,weaponId:type==='weapon'?weaponId:null,items});onClose()}catch(e){alert(e.message)}
  }
  return(<Modal onClose={onClose}><h2>إنشاء امتحان</h2>
    <input placeholder="عنوان الامتحان" value={title} onChange={e=>setTitle(e.target.value)} className="inp" style={{marginBottom:8}}/>
    <select value={type} onChange={e=>setType(e.target.value)} className="inp" style={{marginBottom:8}}><option value="general">عام</option><option value="weapon">سلاح</option><option value="specialty">تخصص</option></select>
    {type==='weapon'&&<select value={weaponId} onChange={e=>setWeaponId(e.target.value)} className="inp" style={{marginBottom:8}}><option value="">اختر السلاح</option>{weapons.map(w=><option key={w.id} value={w.id}>{w.name}</option>)}</select>}
    <textarea placeholder="البند الأول | 10&#10;البند الثاني | 15" value={itemsText} onChange={e=>setItemsText(e.target.value)} rows={5} className="inp" style={{marginBottom:16}}/>
    <div className="btn-row"><button onClick={save} className="btn-primary" style={{flex:1}}>إنشاء</button><button onClick={onClose} className="btn-secondary" style={{flex:1}}>إلغاء</button></div>
  </Modal>);
}

function ResultsPage({results,soldiers,exams,onRefresh,user,onSoldierClick}){
  const[showForm,setShowForm]=useState(false);
  return(<div>
    <div className="page-header"><h1>النتائج</h1><button onClick={()=>setShowForm(true)} className="btn-primary">+ إضافة نتيجة</button></div>
    <div className="soldier-grid">{results.map(r=><div key={r.id} className="soldier-card" style={{cursor:'pointer'}} onClick={()=>onSoldierClick(r.soldier_id)}>
      <div className="soldier-card-name">{r.soldier_name}</div>
      <div className="soldier-card-spec">{r.exam_title||''} • {r.exam_date||''}</div>
      {r.fitness_score!=null&&<div className="three-scores" style={{marginTop:8,gap:4}}>
        <div className="score-card" style={{padding:'4px 8px'}}><div className="score-label" style={{fontSize:10}}>لياقة</div><div className="score-val" style={{fontSize:13}}>{Number(r.fitness_score).toFixed(0)}</div></div>
        <div className="score-card" style={{padding:'4px 8px'}}><div className="score-label" style={{fontSize:10}}>تخصص</div><div className="score-val" style={{fontSize:13}}>{Number(r.specialty_score).toFixed(0)}</div></div>
        <div className="score-card" style={{padding:'4px 8px'}}><div className="score-label" style={{fontSize:10}}>انضباط</div><div className="score-val" style={{fontSize:13}}>{Number(r.discipline_score).toFixed(0)}</div></div>
        </div>}
      <div style={{marginTop:8}}><ScoreBadge score={r.total_score}/></div>
    </div>)}</div>
    {showForm&&<ResultForm soldiers={soldiers} exams={exams} onClose={()=>{setShowForm(false);onRefresh()}}/>}
  </div>);
}

function ResultForm({soldiers,exams,onClose}){
  const[soldierId,setSoldierId]=useState('');const[examId,setExamId]=useState('');const[fScore,setFScore]=useState('');const[sScore,setSScore]=useState('');const[dScore,setDScore]=useState('');
  async function save(){
    try{await api.createResult({examId,soldierId,fitnessScore:parseFloat(fScore)||null,specialtyScore:parseFloat(sScore)||null,disciplineScore:parseFloat(dScore)||null,totalScore:null});onClose()}
    catch(e){alert(e.message)}
  }
  return(<Modal onClose={onClose}><h2>إضافة نتيجة</h2>
    <select value={soldierId} onChange={e=>setSoldierId(e.target.value)} className="inp" style={{marginBottom:8}}><option value="">اختر الجندي</option>{soldiers.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select>
    <select value={examId} onChange={e=>setExamId(e.target.value)} className="inp" style={{marginBottom:16}}><option value="">اختر الامتحان</option>{exams.map(e=><option key={e.id} value={e.id}>{e.title}</option>)}</select>
    <div className="three-scores" style={{marginBottom:16,gap:8}}>
      <div><label style={{fontSize:12,color:S.text2,marginBottom:4,display:'block'}}>اللياقة (0-100)</label><input type="number" value={fScore} onChange={e=>setFScore(e.target.value)} className="inp"/></div>
      <div><label style={{fontSize:12,color:S.text2,marginBottom:4,display:'block'}}>التخصص (0-100)</label><input type="number" value={sScore} onChange={e=>setSScore(e.target.value)} className="inp"/></div>
      <div><label style={{fontSize:12,color:S.text2,marginBottom:4,display:'block'}}>الانضباط (0-100)</label><input type="number" value={dScore} onChange={e=>setDScore(e.target.value)} className="inp"/></div>
    </div>
    <div className="btn-row"><button onClick={save} className="btn-primary" style={{flex:1}}>حفظ</button><button onClick={onClose} className="btn-secondary" style={{flex:1}}>إلغاء</button></div>
  </Modal>);
}

function NotificationPanel({notifications,onMarkRead,onMarkAll,onSoldierClick}){
  return(<div className="notif-panel">
    <div className="notif-header"><h3>الإشعارات</h3><button onClick={onMarkAll} className="btn-text">قراءة الكل</button></div>
    <div className="notif-list">
      {notifications.length===0&&<div className="empty" style={{padding:24}}>لا توجد إشعارات</div>}
      {notifications.map(n=><div key={n.id} className={`notif-item ${n.is_read?'':'unread'}`} onClick={()=>{if(!n.is_read)onMarkRead(n.id);if(n.evaluated_id)onSoldierClick(n.evaluated_id)}}>
        <div className="notif-icon">{n.type==='evaluation'?'📋':n.type==='announcement'?'📢':'⭐'}</div>
        <div className="notif-body">
          <div className="notif-message">{n.message}</div>
          {(n.fitness_score!=null||n.specialty_score!=null||n.discipline_score!=null)&&<div className="notif-scores">
            {n.fitness_score!=null&&<span>لياقة: {Number(n.fitness_score).toFixed(0)}</span>}
            {n.specialty_score!=null&&<span>تخصص: {Number(n.specialty_score).toFixed(0)}</span>}
            {n.discipline_score!=null&&<span>انضباط: {Number(n.discipline_score).toFixed(0)}</span>}
            {n.total_score!=null&&<ScoreBadge score={n.total_score} size={10}/>}
          </div>}
          {n.evaluated_name&&<div className="notif-person">{n.evaluated_name}{n.evaluated_rank?` (${n.evaluated_rank})`:''}</div>}
          <div className="notif-time">{n.created_at?.substring(0,16)||''}</div>
        </div>
        {!n.is_read&&<div className="notif-dot"/>}
      </div>)}
    </div>
  </div>);
}

function NotificationPage({notifications,onMarkRead,onMarkAll,onSoldierClick}){
  return(<div>
    <div className="page-header"><h1>الإشعارات</h1><button onClick={onMarkAll} className="btn-outline">قراءة الكل</button></div>
    <div className="section">
      {notifications.map(n=><div key={n.id} className={`notif-item ${n.is_read?'':'unread'}`} onClick={()=>{if(!n.is_read)onMarkRead(n.id);if(n.evaluated_id)onSoldierClick(n.evaluated_id)}}>
        <div className="notif-icon">{n.type==='evaluation'?'📋':'📢'}</div>
        <div className="notif-body">
          <div className="notif-message">{n.message}</div>
          {(n.fitness_score!=null||n.specialty_score!=null||n.discipline_score!=null)&&<div className="notif-scores">
            {n.fitness_score!=null&&<span>لياقة: {Number(n.fitness_score).toFixed(0)}</span>}
            {n.specialty_score!=null&&<span>تخصص: {Number(n.specialty_score).toFixed(0)}</span>}
            {n.discipline_score!=null&&<span>انضباط: {Number(n.discipline_score).toFixed(0)}</span>}
            {n.total_score!=null&&<ScoreBadge score={n.total_score} size={10}/>}
          </div>}
          <div className="notif-time">{n.created_at?.substring(0,16)||''}</div>
        </div>
        {!n.is_read&&<div className="notif-dot"/>}
      </div>)}
    </div>
  </div>);
}

function AnnouncementsPage({announcements,onRefresh,user}){
  const[showForm,setShowForm]=useState(false);
  const pc={urgent:S.danger,info:S.success,normal:S.text2};
  const pl={urgent:'عاجل',info:'معلومات',normal:'عادي'};
  return(<div>
    <div className="page-header"><h1>الإعلانات</h1>{user?.role==='commander'&&<button onClick={()=>setShowForm(true)} className="btn-primary">+ إعلان جديد</button>}</div>
    {announcements.map(a=><div key={a.id} className="announcement-card">
      <div className="announcement-head"><span className="priority-badge" style={{background:`${pc[a.priority]}30`,color:pc[a.priority]}}>{pl[a.priority]}</span><span className="announcement-title">{a.title}</span></div>
      {a.body&&<div className="announcement-body">{a.body}</div>}
      <div className="announcement-meta">{a.created_by_name} • {a.created_at?.substring(0,10)}</div>
    </div>)}
    {showForm&&<AnnouncementForm onClose={()=>{setShowForm(false);onRefresh()}}/>}
  </div>);
}

function AnnouncementForm({onClose}){
  const[title,setTitle]=useState('');const[body,setBody]=useState('');const[priority,setPriority]=useState('normal');
  async function save(){if(!title)return;try{await api.createAnnouncement({title,body,priority});onClose()}catch(e){alert(e.message)}}
  return(<Modal onClose={onClose}><h2>إعلان جديد</h2>
    <input placeholder="العنوان" value={title} onChange={e=>setTitle(e.target.value)} className="inp" style={{marginBottom:8}}/>
    <textarea placeholder="المحتوى" value={body} onChange={e=>setBody(e.target.value)} rows={4} className="inp" style={{marginBottom:8}}/>
    <select value={priority} onChange={e=>setPriority(e.target.value)} className="inp" style={{marginBottom:16}}><option value="normal">عادي</option><option value="info">معلومات</option><option value="urgent">عاجل</option></select>
    <div className="btn-row"><button onClick={save} className="btn-primary" style={{flex:1}}>نشر</button><button onClick={onClose} className="btn-secondary" style={{flex:1}}>إلغاء</button></div>
  </Modal>);
}

function SoldierProfile({soldier:s,onClose,onDistinguish,onRemoveDistinction,user,ranks,weapons,specialties}){
  const rankName=s.rank_name||'غير محدد';
  const badgeType=s.distinction_badge;
  const badgeLabel=badgeType==='gold'?'🥇 ذهبي':badgeType==='silver'?'🥈 فضي':badgeType==='bronze'?'🥉 برونزي':null;
  return(<Modal onClose={onClose} width={500}>
    <div className={`profile-card ${badgeType?'gold-border':''}`}>
      {badgeType&&<div className="profile-badge">⭐ {badgeLabel}</div>}
      <div className="profile-header">
        <div className="profile-avatar">{s.weapon_icon||'👤'}</div>
        <div><h2>{s.name}</h2><div className="profile-rank">{rankName}</div></div>
      </div>
      <div className="profile-details">
        <div className="profile-row"><span>الرقم العسكري</span><span>{s.military_id||'-'}</span></div>
        <div className="profile-row"><span>السلاح</span><span>{s.weapon_name||'-'}</span></div>
        <div className="profile-row"><span>التخصص العام</span><span>{s.specialty_name||'-'}</span></div>
        <div className="profile-row"><span>التخصص الدقيق</span><span>{s.specific_specialty||'-'}</span></div>
        <div className="profile-row"><span>ملاحظات</span><span>{s.notes||'-'}</span></div>
        {s.distinction_citation&&<div className="profile-row"><span>سبب التمييز</span><span style={{color:S.hdGold}}>{s.distinction_citation}</span></div>}
        {s.distinguished_by_name&&<div className="profile-row"><span>مميز بواسطة</span><span>{s.distinguished_by_name}</span></div>}
      </div>
      {user?.role==='commander'&&<div className="btn-row" style={{marginTop:16}}>
        {badgeType?<button onClick={()=>onRemoveDistinction(s.id)} className="btn-danger" style={{flex:1}}>إزالة التمييز</button>
        :<button onClick={()=>onDistinguish(s)} className="btn-gold" style={{flex:1}}>🎖️ منح وسام</button>}
      </div>}
    </div>
  </Modal>);
}

function DistinguishModal({soldier:s,onClose,onConfirm}){
  const[badge,setBadge]=useState('gold');const[citation,setCitation]=useState('');
  return(<Modal onClose={onClose}><h2>🎖️ منح وسام - {s.name}</h2>
    <div style={{marginBottom:16}}>
      <label style={{display:'block',marginBottom:8,color:S.text2,fontSize:13}}>نوع الوسام</label>
      <div className="badge-options">
        {['gold','silver','bronze'].map(b=><button key={b} onClick={()=>setBadge(b)} className={`badge-option ${badge===b?'selected':''}`}>
          {b==='gold'?'🥇':b==='silver'?'🥈':'🥉'} {b==='gold'?'ذهبي':b==='silver'?'فضي':'برونزي'}
        </button>)}
      </div>
    </div>
    <textarea placeholder="سبب التمييز (مثال: أداء متميز في الرماية)" value={citation} onChange={e=>setCitation(e.target.value)} rows={3} className="inp" style={{marginBottom:16}}/>
    <div className="btn-row"><button onClick={()=>onConfirm(s.id,badge,citation)} className="btn-gold" style={{flex:1}}>تأكيد</button><button onClick={onClose} className="btn-secondary" style={{flex:1}}>إلغاء</button></div>
  </Modal>);
}

function Modal({children,onClose,width}){
  return<div className="modal-overlay" onClick={onClose}><div className="modal-content" style={{maxWidth:width||400}} onClick={e=>e.stopPropagation()}>{children}</div></div>;
}
