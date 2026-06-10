import React,{useState,useEffect,useCallback,useMemo} from 'react';
import {api} from './api';
import 'bootstrap/dist/css/bootstrap.min.css';
import './styles.css';

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
      const[s,sold,ex,res,wp,sp,rt,rk,ann,notif,us]=await Promise.all([
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
        api.getUsers().catch(()=>[]),
      ]);
      setData({stats:s,soldiers:sold,exams:ex,results:res.results||[],weapons:wp,specialties:sp,rankTypes:rt,ranks:rk,announcements:ann,users:us,notifications:notif});
    }catch(e){console.error(e)}
    setLoading(false);
  },[]);

  useEffect(()=>{if(token){loadUser();load()}},[token]);

  useEffect(()=>{
    if(!token)return;
    let prevCount=data.notifications.length;
    const iv=setInterval(async()=>{try{const n=await api.getNotifications();setData(d=>{if(n.length>prevCount&&prevCount>0&&d.notifications.length>0){if(Notification.permission==='granted'){const nu=n[0];new Notification('🔔 إشعار جديد',{body:nu.message||'لديك إشعار جديد'})}}prevCount=n.length;return{...d,notifications:n}})}catch(e){}},10000);
    if('Notification' in window&&Notification.permission==='default')Notification.requestPermission();
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

  const[sbOpen,setSbOpen]=useState(false);
  const ALL_TABS=[
    {id:'dashboard',label:'الرئيسية',icon:'📊'},
    {id:'soldiers',label:'الأفراد',icon:'👥'},
    {id:'exams',label:'الامتحانات',icon:'📝'},
    {id:'results',label:'النتائج',icon:'🏆'},
    {id:'notifications',label:'الإشعارات',icon:'🔔'},
    {id:'announcements',label:'الإعلانات',icon:'📢'},
    {id:'users',label:'المستخدمين',icon:'👤'},
    {id:'settings',label:'الإعدادات',icon:'⚙️'},
    {id:'profile',label:'حسابي',icon:'👤'},
  ];
  const navTabs=useMemo(()=>{
    let tabs;
    if(!u||u.role==='commander')tabs=ALL_TABS;
    else{const allowed=u.permissions?.pages;if(!allowed||!allowed.length)tabs=ALL_TABS.filter(t=>!['users','settings'].includes(t.id));else tabs=ALL_TABS.filter(t=>allowed.includes(t.id))}
    return tabs.map(t=>t.id==='notifications'?{...t,badge:unread}:t);
  },[u,unread]);

  if(page==='login') return <LoginPage onLogin={handleLogin}/>;

  return(
    <div className="d-flex app-layout">
      {/* Desktop sidebar - always visible on md+ */}
      <div className="d-none d-md-flex flex-column border-start border-military" style={{width:220,flexShrink:0,background:'var(--military-card)'}}>
        <div className="text-center p-3 border-bottom border-military">
          <div className="fs-2">🛡️</div>
          <h6 className="text-gold mb-1">كتيبة 20</h6>
          <div className="small text-muted-military">{u?.name}</div>
          <button className="bell-btn mt-2" onClick={()=>setNotifOpen(o=>!o)}>🔔{unread>0&&<span className="bell-badge">{unread}</span>}</button>
        </div>
        <nav className="flex-grow-1 py-2 overflow-auto">
          {navTabs.map(t=><button key={t.id} onClick={()=>setTab(t.id)} className={`sidebar-btn d-flex align-items-center gap-2 w-100 border-0 py-2 px-3 text-muted-military small ${tab===t.id?'active':''}`} style={{background:'none',textAlign:'right'}}>
            <span className="fs-6" style={{width:24,textAlign:'center'}}>{t.icon}</span>
            <span className="flex-grow-1">{t.label}</span>
            {t.badge>0&&<span className="badge bg-danger rounded-pill" style={{fontSize:'0.6rem'}}>{t.badge}</span>}</button>)}
        </nav>
        <button onClick={handleLogout} className="sidebar-btn d-flex align-items-center gap-2 w-100 border-0 border-top border-military py-2 px-3 text-muted-military small" style={{background:'none',textAlign:'right'}}>
          <span className="fs-6" style={{width:24,textAlign:'center'}}>🚪</span><span>تسجيل الخروج</span>
        </button>
      </div>

      {/* Mobile offcanvas sidebar */}
      <div className={`offcanvas offcanvas-start d-md-none ${sbOpen?'show':''}`} style={{width:280,background:'var(--military-card)'}} tabIndex="-1">
        <div className="offcanvas-header border-bottom border-military">
          <h6 className="text-gold mb-0">🛡️ كتيبة 20</h6>
          <button type="button" className="btn-close btn-close-white" onClick={()=>setSbOpen(false)}></button>
        </div>
        <div className="offcanvas-body p-0 d-flex flex-column">
          <div className="small text-muted-military text-center py-2 border-bottom border-military">{u?.name}</div>
          <nav className="flex-grow-1 py-2 overflow-auto">
            {navTabs.map(t=><button key={t.id} onClick={()=>{setTab(t.id);setSbOpen(false)}} className={`sidebar-btn d-flex align-items-center gap-2 w-100 border-0 py-2 px-3 text-muted-military small ${tab===t.id?'active':''}`} style={{background:'none',textAlign:'right'}}>
              <span className="fs-6" style={{width:24,textAlign:'center'}}>{t.icon}</span>
              <span className="flex-grow-1">{t.label}</span>
              {t.badge>0&&<span className="badge bg-danger rounded-pill" style={{fontSize:'0.6rem'}}>{t.badge}</span>}</button>)}
          </nav>
          <button onClick={()=>{handleLogout();setSbOpen(false)}} className="sidebar-btn d-flex align-items-center gap-2 w-100 border-0 border-top border-military py-2 px-3 text-muted-military small" style={{background:'none',textAlign:'right'}}>
            <span className="fs-6" style={{width:24,textAlign:'center'}}>🚪</span><span>تسجيل الخروج</span>
          </button>
        </div>
      </div>
      {sbOpen&&<div className="offcanvas-backdrop fade show d-md-none" onClick={()=>setSbOpen(false)}/>}

      {/* Notifications offcanvas */}
      <div className={`offcanvas offcanvas-start ${notifOpen?'show':''}`} style={{width:340,background:'var(--military-card)'}}>
        <div className="offcanvas-header border-bottom border-military">
          <h5 className="text-gold mb-0">الإشعارات</h5>
          <div className="d-flex gap-2">
            <button onClick={markAllRead} className="btn btn-sm btn-outline-gold">قراءة الكل</button>
            <button onClick={()=>setNotifOpen(false)} className="btn btn-sm btn-outline-secondary">✕</button>
          </div>
        </div>
        <div className="offcanvas-body p-2">
          {data.notifications.length===0&&<p className="text-muted-military text-center p-4">لا توجد إشعارات</p>}
          {data.notifications.map(n=><div key={n.id} className={`notif-item d-flex gap-2 p-2 rounded border border-military mb-1 ${n.is_read?'':'unread'}`} onClick={()=>{if(!n.is_read)markRead(n.id);if(n.evaluated_id){const s=data.soldiers.find(x=>x.id===n.evaluated_id);if(s){setSelectedSoldier(s);setNotifOpen(false)}}}}>
            <div className="fs-5">{n.type==='evaluation'?'📋':'📢'}</div>
            <div className="flex-grow-1 min-w-0">
              <div className="small">{n.message}</div>
              {(n.fitness_score!=null||n.specialty_score!=null||n.discipline_score!=null)&&<div className="notif-scores mt-1">
                {n.fitness_score!=null&&<span>لياقة: {Number(n.fitness_score).toFixed(0)}</span>}
                {n.specialty_score!=null&&<span>تخصص: {Number(n.specialty_score).toFixed(0)}</span>}
                {n.discipline_score!=null&&<span>انضباط: {Number(n.discipline_score).toFixed(0)}</span>}
                {n.total_score!=null&&<ScoreBadge score={n.total_score}/>}
              </div>}
              {n.evaluated_name&&<div className="notif-person">{n.evaluated_name}{n.evaluated_rank?` (${n.evaluated_rank})`:''}</div>}
              <div className="notif-time">{n.created_at?.substring(0,16)||''}</div>
            </div>
            {!n.is_read&&<div className="mt-2"><div style={{width:8,height:8,borderRadius:'50%',background:'var(--military-gold-bright)'}}/></div>}
          </div>)}
        </div>
      </div>

      {/* Main content area - fills remaining height */}
      <div className="d-flex flex-column flex-grow-1 overflow-hidden">
        {/* Mobile top bar */}
        <div className="d-md-none d-flex align-items-center p-2 border-bottom border-military bg-card gap-2">
          <button className="btn btn-sm btn-outline-gold" onClick={()=>setSbOpen(true)}>☰</button>
          <div className="flex-grow-1 text-center"><span className="text-gold small fw-bold">🛡️ كتيبة 20</span></div>
          <button className="bell-btn" onClick={()=>setNotifOpen(o=>!o)}>🔔{unread>0&&<span className="bell-badge">{unread}</span>}</button>
        </div>
        {/* Scrollable content fills remaining space */}
        <div className="flex-grow-1 overflow-auto p-3">
          {tab==='dashboard'&&<DashboardPage stats={data.stats} loading={loading} soldiers={data.soldiers} onRefresh={load}
            onDistinguish={s=>setDistinguishModal(s)} onSoldierClick={s=>setSelectedSoldier(s)}/>}
          {tab==='soldiers'&&<SoldiersPage soldiers={data.soldiers} weapons={data.weapons} specialties={data.specialties} ranks={data.ranks} rankTypes={data.rankTypes} onRefresh={load} user={u}
            onDistinguish={s=>setDistinguishModal(s)} onSoldierClick={s=>setSelectedSoldier(s)}/>}
          {tab==='exams'&&<ExamsPage exams={data.exams} weapons={data.weapons} onRefresh={load} user={u}/>}
          {tab==='results'&&<ResultsPage results={data.results} soldiers={data.soldiers} exams={data.exams} onRefresh={load} user={u}
            onSoldierClick={s=>{const found=data.soldiers.find(x=>x.id===s);if(found)setSelectedSoldier(found)}}/>}
          {tab==='notifications'&&<NotificationPage notifications={data.notifications} onMarkRead={markRead} onMarkAll={markAllRead}
            onSoldierClick={id=>{const s=data.soldiers.find(x=>x.id===id);if(s)setSelectedSoldier(s)}}/>}
          {tab==='announcements'&&<AnnouncementsPage announcements={data.announcements} onRefresh={load} user={u}/>}
          {tab==='users'&&<UsersPage users={data.users} ranks={data.ranks} onRefresh={load} user={u}/>}
          {tab==='settings'&&<SettingsPage weapons={data.weapons} specialties={data.specialties} ranks={data.ranks} rankTypes={data.rankTypes} onRefresh={load} user={u}/>}
          {tab==='profile'&&<ProfilePage user={u}/>}
        </div>
      </div>

      {selectedSoldier&&<SoldierProfile soldier={selectedSoldier} onClose={()=>setSelectedSoldier(null)}
        onDistinguish={s=>{setSelectedSoldier(null);setDistinguishModal(s)}}
        onRemoveDistinction={async id=>{try{await api.removeDistinction(id);setSelectedSoldier(null);load()}catch(e){alert(e.message)}}} user={u}/>}
      {distinguishModal&&<DistinguishModal soldier={distinguishModal} onClose={()=>setDistinguishModal(null)}
        onConfirm={async(id,badge,citation)=>{try{await api.distinguishSoldier(id,badge,citation);setDistinguishModal(null);load()}catch(e){alert(e.message)}}}/>}
    </div>
  );
}

function LoginPage({onLogin}){
  const[u,setU]=useState('');const[p,setP]=useState('');const[ld,setLd]=useState(false);
  async function h(e){e.preventDefault();setLd(true);try{await onLogin(u,p)}catch{}setLd(false)}
  return(<div className="vh-100 d-flex align-items-center justify-content-center bg-military">
    <div className="card border-military p-4" style={{maxWidth:360,width:'100%'}}>
      <div className="text-center mb-3"><span className="fs-1">🛡️</span><h2 className="text-gold mt-2">كتيبة 20</h2><p className="text-muted-military small">نظام التقييم العسكري</p></div>
      <form onSubmit={h}>
        <input className="form-control bg-card text-light border-military mb-2" placeholder="اسم المستخدم" value={u} onChange={e=>setU(e.target.value)}/>
        <input type="password" className="form-control bg-card text-light border-military mb-3" placeholder="كلمة المرور" value={p} onChange={e=>setP(e.target.value)}/>
        <button type="submit" disabled={ld} className="btn btn-gold w-100">{ld?'جاري...':'تسجيل الدخول'}</button>
      </form>
    </div>
  </div>);
}

function DashboardPage({stats,loading,soldiers,onRefresh,onDistinguish,onSoldierClick}){
  if(loading||!stats) return <div className="text-center text-muted-military py-5"><div className="loading-spinner"/><p className="mt-2">جاري تحميل البيانات...</p></div>;
  const dist=stats.distribution||{};
  const totalDist=['excellent','veryGood','good','acceptable','fail'].reduce((s,k)=>s+(dist[k]||0),0);
  const recent=stats.recentResults||[];
  const distinguished=soldiers.filter(s=>s.distinction_badge);

  return(<div>
    <div className="d-flex justify-content-between align-items-center mb-3"><h4 className="text-gold mb-0">لوحة القيادة</h4><button onClick={onRefresh} className="btn btn-outline-gold btn-sm">🔄 تحديث</button></div>
    <div className="row g-2 mb-3">
      {[{l:'الأفراد',v:stats.totalSoldiers,i:'👥'},{l:'النتائج',v:stats.totalResults,i:'🏆'},{l:'المعدل',v:`${stats.avgScore}%`,i:'📈'},{l:'النجاح',v:`${stats.passRate}%`,i:'✅'}].map(({l,v,i})=>
        <div key={l} className="col-6 col-md-3"><div className="card border-military p-3 text-center stat-card"><div className="fs-4 mb-1">{i}</div><div className="fs-3 fw-bold text-gold">{v}</div><div className="small text-muted-military">{l}</div></div></div>
      )}
    </div>
    <div className="row g-2 mb-3">
      {[{l:'اللياقة',v:stats.avgFitness},{l:'التخصص',v:stats.avgSpecialty},{l:'الانضباط',v:stats.avgDiscipline}].map(({l,v})=>
        <div key={l} className="col-4"><div className="card border-military p-2 text-center"><div className="small text-muted-military">{l}</div><div className="fs-5 fw-bold text-gold-bright">{v!=null?`${Number(v).toFixed(1)}%`:'-'}</div></div></div>
      )}
    </div>
    {distinguished.length>0&&<div className="card border-military p-3 mb-3"><h6 className="text-gold mb-2">⭐ الأفراد المميزون</h6><div className="row g-2">{distinguished.map(s=><SoldierCard key={s.id} soldier={s} onDistinguish={onDistinguish} onClick={onSoldierClick}/>)}</div></div>}
    <div className="row g-2 mb-3">
      <div className="col-12 col-md-6"><div className="card border-military p-3"><h6 className="text-gold mb-2">توزيع الدرجات</h6>
        {totalDist>0?['excellent','veryGood','good','acceptable','fail'].map(k=>{
          const lbs={excellent:'ممتاز',veryGood:'جيد جداً',good:'جيد',acceptable:'مقبول',fail:'راسب'};
          const cs={excellent:'#1B8A2E',veryGood:'#2D6A4F',good:'#C9A84C',acceptable:'#E9C46A',fail:'#E63946'};
          const pct=totalDist>0?((dist[k]||0)/totalDist*100).toFixed(1):0;
          return(<div key={k} className="mb-2"><div className="d-flex justify-content-between small mb-1"><span>{lbs[k]}</span><span style={{color:cs[k]}}>{dist[k]||0} ({pct}%)</span></div><div className="progress" style={{height:8,background:'rgba(255,255,255,0.06)'}}><div className="progress-bar" style={{width:`${pct}%`,background:cs[k]}}/></div></div>);
        }):<p className="text-muted-military small mb-0">لا توجد نتائج بعد</p>}
      </div></div>
      <div className="col-12 col-md-6"><div className="card border-military p-3"><h6 className="text-gold mb-2">حسب السلاح</h6>
        {(stats.byWeapon||[]).map(w=><div key={w.weapon_name} className="d-flex align-items-center gap-2 py-1 border-bottom border-military"><span className="fs-5" style={{width:28,textAlign:'center'}}>{w.weapon_icon||'⚔️'}</span><div className="flex-grow-1"><div className="small">{w.weapon_name}</div><div className="small text-muted-military" style={{fontSize:'0.7rem'}}>{w.count} فرد</div></div><ScoreBadge score={w.avg}/></div>)}
      </div></div>
    </div>
    <div className="card border-military p-3"><h6 className="text-gold mb-2">آخر النتائج</h6>
      {recent.map(r=><div key={r.id} className="result-row d-flex align-items-center gap-2 py-1 border-bottom border-military" onClick={()=>{const s=soldiers.find(x=>x.id===r.soldier_id);if(s)onSoldierClick(s)}}>
        <div className="flex-grow-1"><div className="small">{r.soldier_name}{r.distinction_badge?<span className="me-1">⭐</span>:''}</div><div className="small text-muted-military" style={{fontSize:'0.7rem'}}>{r.exam_title||''}</div></div>
        {r.fitness_score!=null&&<div className="d-flex gap-1"><span className="badge bg-dark border border-military" style={{fontSize:'0.65rem'}}>ل{Number(r.fitness_score).toFixed(0)}</span><span className="badge bg-dark border border-military" style={{fontSize:'0.65rem'}}>ت{Number(r.specialty_score).toFixed(0)}</span><span className="badge bg-dark border border-military" style={{fontSize:'0.65rem'}}>د{Number(r.discipline_score).toFixed(0)}</span></div>}
        <ScoreBadge score={r.total_score}/>
      </div>)}
    </div>
  </div>);
}

function SoldierCard({soldier:s,onDistinguish,onClick}){
  const isGold=s.distinction_badge==='gold';
  return(<div className={`col-6 col-md-3`}>
    <div className={`card border-military p-2 text-center soldier-card position-relative ${isGold?'gold-border':''} ${s.distinction_badge?'':''}`} onClick={()=>onClick(s)}>
      {s.distinction_badge&&<div className="distinction-star">⭐</div>}
      <div className="small text-gold fw-bold">{s.rank_name||'جندي'}</div>
      <div className="small fw-bold text-truncate">{s.name}</div>
      <div className="small text-muted-military" style={{fontSize:'0.7rem'}}>{s.weapon_icon||'👤'} {s.weapon_name||''}</div>
      <div className="small text-muted-military" style={{fontSize:'0.65rem'}}>{s.specialty_name||''}{s.specific_specialty?` • ${s.specific_specialty}`:''}</div>
      <div className="mt-1">{s.distinction_badge?<span className={`badge ${s.distinction_badge==='gold'?'badge-gold':s.distinction_badge==='silver'?'badge-silver':'badge-bronze'} px-2 py-1`} style={{fontSize:'0.6rem'}}>{s.distinction_badge==='gold'?'🥇':s.distinction_badge==='silver'?'🥈':'🥉'} مميز</span>:''}</div>
      {onDistinguish&&<button className="btn btn-sm btn-outline-gold mt-1" style={{fontSize:'0.65rem'}} onClick={e=>{e.stopPropagation();onDistinguish(s)}}>🎖️ تمييز</button>}
    </div>
  </div>);
}

function ScoreBadge({score,size}){
  if(score==null)return null;
  const v=Number(score);
  const c=v>=90?'#1B8A2E':v>=75?'#2D6A4F':v>=65?'#C9A84C':v>=50?'#E9C46A':'#E63946';
  const l=v>=90?'ممتاز':v>=75?'جيد جداً':v>=65?'جيد':v>=50?'مقبول':'راسب';
  return<span className="score-badge" style={{background:`${c}30`,color:c,border:`1px solid ${c}80`,fontSize:size||11}}>{l} {v.toFixed(1)}%</span>;
}

function SoldiersPage({soldiers,weapons,specialties,ranks,rankTypes,onRefresh,user,onDistinguish,onSoldierClick}){
  const[search,setSearch]=useState('');const[weaponFilter,setWeaponFilter]=useState('');
  const[editSoldier,setEditSoldier]=useState(null);
  const filtered=soldiers.filter(s=>{if(search&&!s.name.includes(search)&&!s.military_id?.includes(search))return false;if(weaponFilter&&s.weapon_id!==weaponFilter)return false;return true});
  return(<div>
    <div className="d-flex justify-content-between align-items-center mb-3"><h4 className="text-gold mb-0">الأفراد</h4><button onClick={()=>setEditSoldier({})} className="btn btn-gold btn-sm">+ إضافة جندي</button></div>
    <div className="d-flex gap-2 mb-3"><input placeholder="بحث بالاسم أو الرقم..." value={search} onChange={e=>setSearch(e.target.value)} className="form-control bg-card text-light border-military" style={{maxWidth:300}}/>
      <select value={weaponFilter} onChange={e=>setWeaponFilter(e.target.value)} className="form-select bg-card text-light border-military" style={{maxWidth:160}}><option value="">الكل</option>{weapons.map(w=><option key={w.id} value={w.id}>{w.icon} {w.name}</option>)}</select></div>
    {/* Mobile: card grid */}
    <div className="row g-2 d-md-none">{filtered.map(s=><SoldierCard key={s.id} soldier={s} onDistinguish={user?.role==='commander'?onDistinguish:null} onClick={onSoldierClick}/>)}</div>
    {/* Desktop: data table */}
    <div className="table-responsive d-none d-md-block"><table className="table table-sm table-hover border-military"><thead><tr className="text-gold small">
      <th>الرتبة</th><th>الاسم</th><th>السلاح</th><th>التخصص العام</th><th>التخصص الدقيق</th><th>اللياقة</th><th>التخصص</th><th>الانضباط</th><th>المجموع</th><th>الوسام</th><th></th>
    </tr></thead><tbody>{filtered.map(s=>{
      const last=s.last_result||{};
      return(<tr key={s.id} className={s.distinction_badge?'distinguished-row':''} style={{cursor:'pointer'}} onClick={()=>onSoldierClick(s)}>
        <td><span className="badge bg-dark border border-military px-2 py-1" style={{fontSize:'0.65rem'}}>{s.rank_name||'-'}</span></td>
        <td className="small">{s.name}{s.distinction_badge?'⭐':''}</td>
        <td className="small">{s.weapon_icon||''} {s.weapon_name||'-'}</td>
        <td className="small">{s.specialty_name||'-'}</td>
        <td className="small">{s.specific_specialty||'-'}</td>
        <td className="small">{last.fitness_score!=null?`${Number(last.fitness_score).toFixed(0)}`:'-'}</td>
        <td className="small">{last.specialty_score!=null?`${Number(last.specialty_score).toFixed(0)}`:'-'}</td>
        <td className="small">{last.discipline_score!=null?`${Number(last.discipline_score).toFixed(0)}`:'-'}</td>
        <td className="small">{last.total_score!=null?<ScoreBadge score={last.total_score}/>:'-'}</td>
        <td className="small">{s.distinction_badge?<span className={`badge ${s.distinction_badge==='gold'?'badge-gold':s.distinction_badge==='silver'?'badge-silver':'badge-bronze'}`}>🥇</span>:'-'}</td>
        <td>{user?.role==='commander'&&<button className="btn btn-sm btn-outline-gold py-0 px-1" style={{fontSize:'0.65rem'}} onClick={e=>{e.stopPropagation();onDistinguish(s)}}>🎖️</button>}</td>
      </tr>)
    })}</tbody></table></div>
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
  return(<Modal onClose={onClose}><h5 className="text-gold mb-3">{soldier.id?'تعديل جندي':'إضافة جندي'}</h5>
    <input placeholder="الاسم" value={name} onChange={e=>setName(e.target.value)} className="form-control bg-card text-light border-military mb-2"/>
    <input placeholder="الرقم العسكري" value={mId} onChange={e=>setMId(e.target.value)} className="form-control bg-card text-light border-military mb-2"/>
    <select value={wId} onChange={e=>setWId(e.target.value)} className="form-select bg-card text-light border-military mb-2"><option value="">اختر السلاح</option>{weapons.map(w=><option key={w.id} value={w.id}>{w.icon} {w.name}</option>)}</select>
    <select value={spId} onChange={e=>setSpId(e.target.value)} className="form-select bg-card text-light border-military mb-2"><option value="">اختر التخصص العام</option>{specs.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select>
    <input placeholder="التخصص الدقيق" value={spSpec} onChange={e=>setSpSpec(e.target.value)} className="form-control bg-card text-light border-military mb-2"/>
    <select value={rId} onChange={e=>setRId(e.target.value)} className="form-select bg-card text-light border-military mb-2"><option value="">اختر الرتبة</option>{ranks.map(r=><option key={r.id} value={r.id}>{r.name}</option>)}</select>
    <textarea placeholder="ملاحظات" value={notes} onChange={e=>setNotes(e.target.value)} rows={3} className="form-control bg-card text-light border-military mb-3"/>
    <div className="d-flex gap-2"><button onClick={save} className="btn btn-gold flex-grow-1">حفظ</button><button onClick={onClose} className="btn btn-outline-secondary flex-grow-1">إلغاء</button></div>
  </Modal>);
}

function ExamsPage({exams,weapons,onRefresh,user}){
  const[typeFilter,setTypeFilter]=useState('');const[showForm,setShowForm]=useState(false);
  const filtered=exams.filter(e=>!typeFilter||e.type===typeFilter);
  return(<div>
    <div className="d-flex justify-content-between align-items-center mb-3"><h4 className="text-gold mb-0">الامتحانات</h4>{user?.role==='commander'&&<button onClick={()=>setShowForm(true)} className="btn btn-gold btn-sm">+ إنشاء امتحان</button>}</div>
    <select value={typeFilter} onChange={e=>setTypeFilter(e.target.value)} className="form-select bg-card text-light border-military mb-3" style={{maxWidth:200}}><option value="">الكل</option><option value="general">عام</option><option value="weapon">سلاح</option><option value="specialty">تخصص</option></select>
    <div className="row g-2">{filtered.map(e=><div key={e.id} className="col-6 col-md-3"><div className="card border-military p-2 text-center"><div className="small fw-bold">{e.title}</div><div className="small text-muted-military" style={{fontSize:'0.65rem'}}>{e.type} • {e.item_count} بند • {e.result_count} نتيجة</div>{e.avg_score!=null&&<div className="mt-1"><ScoreBadge score={e.avg_score}/></div>}</div></div>)}
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
  return(<Modal onClose={onClose}><h5 className="text-gold mb-3">إنشاء امتحان</h5>
    <input placeholder="عنوان الامتحان" value={title} onChange={e=>setTitle(e.target.value)} className="form-control bg-card text-light border-military mb-2"/>
    <select value={type} onChange={e=>setType(e.target.value)} className="form-select bg-card text-light border-military mb-2"><option value="general">عام</option><option value="weapon">سلاح</option><option value="specialty">تخصص</option></select>
    {type==='weapon'&&<select value={weaponId} onChange={e=>setWeaponId(e.target.value)} className="form-select bg-card text-light border-military mb-2"><option value="">اختر السلاح</option>{weapons.map(w=><option key={w.id} value={w.id}>{w.name}</option>)}</select>}
    <textarea placeholder="البند الأول | 10&#10;البند الثاني | 15" value={itemsText} onChange={e=>setItemsText(e.target.value)} rows={5} className="form-control bg-card text-light border-military mb-3"/>
    <div className="d-flex gap-2"><button onClick={save} className="btn btn-gold flex-grow-1">إنشاء</button><button onClick={onClose} className="btn btn-outline-secondary flex-grow-1">إلغاء</button></div>
  </Modal>);
}

function ResultsPage({results,soldiers,exams,onRefresh,user,onSoldierClick}){
  const[showForm,setShowForm]=useState(false);
  return(<div>
    <div className="d-flex justify-content-between align-items-center mb-3"><h4 className="text-gold mb-0">النتائج</h4><button onClick={()=>setShowForm(true)} className="btn btn-gold btn-sm">+ إضافة نتيجة</button></div>
    <div className="row g-2">{results.map(r=><div key={r.id} className="col-6 col-md-3"><div className="card border-military p-2 text-center" style={{cursor:'pointer'}} onClick={()=>onSoldierClick(r.soldier_id)}>
      <div className="small fw-bold">{r.soldier_name}</div>
      <div className="small text-muted-military" style={{fontSize:'0.65rem'}}>{r.exam_title||''} • {r.exam_date||''}</div>
      {r.fitness_score!=null&&<div className="row g-1 mt-1">
        <div className="col-4"><div className="card bg-dark border-military p-1"><div className="small text-muted-military" style={{fontSize:'0.6rem'}}>ل</div><div className="small fw-bold" style={{fontSize:'0.8rem'}}>{Number(r.fitness_score).toFixed(0)}</div></div></div>
        <div className="col-4"><div className="card bg-dark border-military p-1"><div className="small text-muted-military" style={{fontSize:'0.6rem'}}>ت</div><div className="small fw-bold" style={{fontSize:'0.8rem'}}>{Number(r.specialty_score).toFixed(0)}</div></div></div>
        <div className="col-4"><div className="card bg-dark border-military p-1"><div className="small text-muted-military" style={{fontSize:'0.6rem'}}>د</div><div className="small fw-bold" style={{fontSize:'0.8rem'}}>{Number(r.discipline_score).toFixed(0)}</div></div></div>
      </div>}
      <div className="mt-1"><ScoreBadge score={r.total_score}/></div>
    </div></div>)}</div>
    {showForm&&<ResultForm soldiers={soldiers} exams={exams} onClose={()=>{setShowForm(false);onRefresh()}}/>}
  </div>);
}

function ResultForm({soldiers,exams,onClose}){
  const[soldierId,setSoldierId]=useState('');const[examId,setExamId]=useState('');const[fScore,setFScore]=useState('');const[sScore,setSScore]=useState('');const[dScore,setDScore]=useState('');
  async function save(){
    try{await api.createResult({examId,soldierId,fitnessScore:parseFloat(fScore)||null,specialtyScore:parseFloat(sScore)||null,disciplineScore:parseFloat(dScore)||null,totalScore:null});onClose()}
    catch(e){alert(e.message)}
  }
  return(<Modal onClose={onClose}><h5 className="text-gold mb-3">إضافة نتيجة</h5>
    <select value={soldierId} onChange={e=>setSoldierId(e.target.value)} className="form-select bg-card text-light border-military mb-2"><option value="">اختر الجندي</option>{soldiers.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select>
    <select value={examId} onChange={e=>setExamId(e.target.value)} className="form-select bg-card text-light border-military mb-3"><option value="">اختر الامتحان</option>{exams.map(e=><option key={e.id} value={e.id}>{e.title}</option>)}</select>
    <div className="row g-2 mb-3">
      <div className="col-4"><label className="small text-muted-military d-block mb-1">اللياقة (0-100)</label><input type="number" value={fScore} onChange={e=>setFScore(e.target.value)} className="form-control bg-card text-light border-military"/></div>
      <div className="col-4"><label className="small text-muted-military d-block mb-1">التخصص (0-100)</label><input type="number" value={sScore} onChange={e=>setSScore(e.target.value)} className="form-control bg-card text-light border-military"/></div>
      <div className="col-4"><label className="small text-muted-military d-block mb-1">الانضباط (0-100)</label><input type="number" value={dScore} onChange={e=>setDScore(e.target.value)} className="form-control bg-card text-light border-military"/></div>
    </div>
    <div className="d-flex gap-2"><button onClick={save} className="btn btn-gold flex-grow-1">حفظ</button><button onClick={onClose} className="btn btn-outline-secondary flex-grow-1">إلغاء</button></div>
  </Modal>);
}

function NotificationPage({notifications,onMarkRead,onMarkAll,onSoldierClick}){
  return(<div>
    <div className="d-flex justify-content-between align-items-center mb-3"><h4 className="text-gold mb-0">الإشعارات</h4><button onClick={onMarkAll} className="btn btn-outline-gold btn-sm">قراءة الكل</button></div>
    <div className="list-group">{notifications.map(n=><div key={n.id} className={`list-group-item list-group-item-action notif-item d-flex gap-2 align-items-start ${n.is_read?'':'unread'}`} onClick={()=>{if(!n.is_read)onMarkRead(n.id);if(n.evaluated_id)onSoldierClick(n.evaluated_id)}}>
      <div className="fs-5">{n.type==='evaluation'?'📋':'📢'}</div>
      <div className="flex-grow-1"><div className="small">{n.message}</div>
        {(n.fitness_score!=null||n.specialty_score!=null||n.discipline_score!=null)&&<div className="notif-scores mt-1">
          {n.fitness_score!=null&&<span>لياقة: {Number(n.fitness_score).toFixed(0)}</span>}
          {n.specialty_score!=null&&<span>تخصص: {Number(n.specialty_score).toFixed(0)}</span>}
          {n.discipline_score!=null&&<span>انضباط: {Number(n.discipline_score).toFixed(0)}</span>}
          {n.total_score!=null&&<ScoreBadge score={n.total_score}/>}
        </div>}
        <div className="notif-time mt-1">{n.created_at?.substring(0,16)||''}</div>
      </div>
      {!n.is_read&&<div style={{width:8,height:8,borderRadius:'50%',background:'var(--military-gold-bright)',flexShrink:0}}/>}
    </div>)}
    {notifications.length===0&&<p className="text-muted-military text-center p-4">لا توجد إشعارات</p>}
    </div>
  </div>);
}

function AnnouncementsPage({announcements,onRefresh,user}){
  const[showForm,setShowForm]=useState(false);
  const pc={urgent:'#E63946',info:'#2D6A4F',normal:'#9CAF88'};
  const pl={urgent:'عاجل',info:'معلومات',normal:'عادي'};
  return(<div>
    <div className="d-flex justify-content-between align-items-center mb-3"><h4 className="text-gold mb-0">الإعلانات</h4>{(user?.role==='commander'||user?.role==='officer')&&<button onClick={()=>setShowForm(true)} className="btn btn-gold btn-sm">+ إعلان جديد</button>}</div>
    {announcements.map(a=><div key={a.id} className="card border-military p-3 mb-2"><div className="d-flex align-items-center gap-2 mb-1"><span className="badge" style={{background:`${pc[a.priority]}30`,color:pc[a.priority]}}>{pl[a.priority]}</span><span className="small fw-bold">{a.title}</span></div>{a.body&&<p className="small text-muted-military mb-1">{a.body}</p>}<div className="small text-muted-military" style={{fontSize:'0.65rem'}}>{a.created_by_name} • {a.created_at?.substring(0,10)}</div></div>)}
    {showForm&&<AnnouncementForm onClose={()=>{setShowForm(false);onRefresh()}}/>}
  </div>);
}

function AnnouncementForm({onClose}){
  const[title,setTitle]=useState('');const[body,setBody]=useState('');const[priority,setPriority]=useState('normal');
  async function save(){if(!title)return;try{await api.createAnnouncement({title,body,priority});onClose()}catch(e){alert(e.message)}}
  return(<Modal onClose={onClose}><h5 className="text-gold mb-3">إعلان جديد</h5>
    <input placeholder="العنوان" value={title} onChange={e=>setTitle(e.target.value)} className="form-control bg-card text-light border-military mb-2"/>
    <textarea placeholder="المحتوى" value={body} onChange={e=>setBody(e.target.value)} rows={4} className="form-control bg-card text-light border-military mb-2"/>
    <select value={priority} onChange={e=>setPriority(e.target.value)} className="form-select bg-card text-light border-military mb-3"><option value="normal">عادي</option><option value="info">معلومات</option><option value="urgent">عاجل</option></select>
    <div className="d-flex gap-2"><button onClick={save} className="btn btn-gold flex-grow-1">نشر</button><button onClick={onClose} className="btn btn-outline-secondary flex-grow-1">إلغاء</button></div>
  </Modal>);
}

function SoldierProfile({soldier,onClose,onDistinguish,onRemoveDistinction,user}){
  const s=soldier;
  return(<Modal onClose={onClose} width={500}>
    <div className={`${s.distinction_badge?'gold-border':''} rounded p-3`}>
      {s.distinction_badge&&<div className="badge-gold px-2 py-1 rounded mb-2 d-inline-block">⭐ {s.distinction_badge==='gold'?'🥇 ذهبي':s.distinction_badge==='silver'?'🥈 فضي':'🥉 برونزي'}</div>}
      <div className="d-flex align-items-center gap-3 mb-3"><div className="fs-1">{s.weapon_icon||'👤'}</div><div><h5 className="mb-0">{s.name}</h5><div className="small text-gold">{s.rank_name||'غير محدد'}</div></div></div>
      <table className="table table-borderless table-sm mb-0"><tbody>
        {[{l:'الرقم العسكري',v:s.military_id},{l:'السلاح',v:s.weapon_name},{l:'التخصص العام',v:s.specialty_name},{l:'التخصص الدقيق',v:s.specific_specialty},{l:'ملاحظات',v:s.notes}].map(r=><tr key={r.l}><td className="text-muted-military small py-1">{r.l}</td><td className="small py-1">{r.v||'-'}</td></tr>)}
      </tbody></table>
      {s.distinction_citation&&<div className="d-flex justify-content-between py-1 border-bottom border-military"><span className="small text-muted-military">سبب التمييز</span><span className="small text-gold-bright">{s.distinction_citation}</span></div>}
      {s.distinguished_by_name&&<div className="d-flex justify-content-between py-1"><span className="small text-muted-military">مميز بواسطة</span><span className="small">{s.distinguished_by_name}</span></div>}
      {user?.role==='commander'&&<div className="d-flex gap-2 mt-3">{s.distinction_badge?<button onClick={()=>onRemoveDistinction(s.id)} className="btn btn-danger-military btn-sm flex-grow-1">إزالة التمييز</button>:<button onClick={()=>onDistinguish(s)} className="btn btn-gold btn-sm flex-grow-1">🎖️ منح وسام</button>}</div>}
    </div>
  </Modal>);
}

function DistinguishModal({soldier,onClose,onConfirm}){
  const[badge,setBadge]=useState('gold');const[citation,setCitation]=useState('');
  const s=soldier;
  return(<Modal onClose={onClose}><h5 className="text-gold mb-3">🎖️ منح وسام - {s.name}</h5>
    <label className="small text-muted-military d-block mb-2">نوع الوسام</label>
    <div className="d-flex gap-2 mb-3">{['gold','silver','bronze'].map(b=><button key={b} onClick={()=>setBadge(b)} className={`btn flex-grow-1 ${badge===b?'btn-gold':'btn-outline-secondary'}`}>{b==='gold'?'🥇':b==='silver'?'🥈':'🥉'} {b==='gold'?'ذهبي':b==='silver'?'فضي':'برونزي'}</button>)}</div>
    <textarea placeholder="سبب التمييز (مثال: أداء متميز في الرماية)" value={citation} onChange={e=>setCitation(e.target.value)} rows={3} className="form-control bg-card text-light border-military mb-3"/>
    <div className="d-flex gap-2"><button onClick={()=>onConfirm(s.id,badge,citation)} className="btn btn-gold flex-grow-1">تأكيد</button><button onClick={onClose} className="btn btn-outline-secondary flex-grow-1">إلغاء</button></div>
  </Modal>);
}

function SettingsPage({weapons,specialties,ranks,rankTypes,onRefresh,user}){
  const[stab,setStab]=useState('weapons');
  return(<div>
    <div className="d-flex justify-content-between align-items-center mb-3"><h4 className="text-gold mb-0">الإعدادات</h4></div>
    <ul className="nav nav-tabs border-military mb-3">
      <li className="nav-item"><button className={`nav-link ${stab==='weapons'?'active':''} text-muted-military`} onClick={()=>setStab('weapons')}>الأسلحة</button></li>
      <li className="nav-item"><button className={`nav-link ${stab==='specialties'?'active':''} text-muted-military`} onClick={()=>setStab('specialties')}>التخصصات</button></li>
      <li className="nav-item"><button className={`nav-link ${stab==='ranks'?'active':''} text-muted-military`} onClick={()=>setStab('ranks')}>الرتب والرتب العسكرية</button></li>
    </ul>
    {stab==='weapons'&&<WeaponsSettings weapons={weapons} onRefresh={onRefresh} user={user}/>}
    {stab==='specialties'&&<SpecialtiesSettings specialties={specialties} weapons={weapons} onRefresh={onRefresh} user={user}/>}
    {stab==='ranks'&&<RanksSettings ranks={ranks} rankTypes={rankTypes} onRefresh={onRefresh} user={user}/>}
    {user?.role==='commander'&&<div className="mt-4 p-3" style={{borderTop:'1px solid var(--military-border)'}}>
      <button className="btn btn-outline-gold btn-sm" onClick={async()=>{try{await api.seedDemoData();alert('✅ تم إضافة البيانات التجريبية');onRefresh()}catch(e){alert(e.message)}}}>🌱 إضافة بيانات تجريبية</button>
      <p className="text-muted-military small mt-1 mb-0">يضيف أسلحة وتخصصات ورتب وجندي وامتحان تجريبي</p>
    </div>}
  </div>);
}
function WeaponsSettings({weapons,onRefresh,user}){
  const[newName,setNewName]=useState('');const[newIcon,setNewIcon]=useState('');
  async function add(){if(!newName)return;try{await api.createWeapon({name:newName,icon:newIcon||null});setNewName('');setNewIcon('');onRefresh()}catch(e){alert(e.message)}}
  async function del(id){if(!confirm('حذف السلاح؟'))return;try{await api.deleteWeapon(id);onRefresh()}catch(e){alert(e.message)}}
  return(<div className="card border-military p-3">
    <h6 className="text-gold mb-2">الأسلحة</h6>
    {user?.role==='commander'&&<div className="d-flex gap-2 mb-3">
      <input placeholder="اسم السلاح" value={newName} onChange={e=>setNewName(e.target.value)} className="form-control bg-card text-light border-military" style={{maxWidth:200}}/>
      <input placeholder="أيقونة" value={newIcon} onChange={e=>setNewIcon(e.target.value)} className="form-control bg-card text-light border-military" style={{maxWidth:80}}/>
      <button onClick={add} className="btn btn-gold btn-sm">إضافة</button>
    </div>}
    <div className="list-group">{weapons.map(w=><div key={w.id} className="list-group-item bg-card border-military d-flex justify-content-between align-items-center"><span>{w.icon||'⚔️'} {w.name}</span>{user?.role==='commander'&&<button onClick={()=>del(w.id)} className="btn btn-sm btn-outline-danger py-0">✕</button>}</div>)}
      {weapons.length===0&&<p className="text-muted-military small mb-0">لا توجد أسلحة</p>}
    </div>
  </div>);
}
function SpecialtiesSettings({specialties,weapons,onRefresh,user}){
  const[newName,setNewName]=useState('');const[weaponId,setWeaponId]=useState('');
  async function add(){if(!newName||!weaponId)return;try{await api.createSpecialty({name:newName,weaponId});setNewName('');onRefresh()}catch(e){alert(e.message)}}
  async function del(id){if(!confirm('حذف التخصص؟'))return;try{await api.deleteSpecialty(id);onRefresh()}catch(e){alert(e.message)}}
  const filtered=weaponId?specialties.filter(s=>s.weapon_id===weaponId):specialties;
  return(<div className="card border-military p-3">
    <h6 className="text-gold mb-2">التخصصات</h6>
    {user?.role==='commander'&&<div className="d-flex gap-2 mb-3 flex-wrap">
      <select value={weaponId} onChange={e=>setWeaponId(e.target.value)} className="form-select bg-card text-light border-military" style={{maxWidth:160}}><option value="">كل الأسلحة</option>{weapons.map(w=><option key={w.id} value={w.id}>{w.icon||'⚔️'} {w.name}</option>)}</select>
      <input placeholder="اسم التخصص" value={newName} onChange={e=>setNewName(e.target.value)} className="form-control bg-card text-light border-military" style={{maxWidth:200}}/>
      <button onClick={add} className="btn btn-gold btn-sm" disabled={!weaponId}>إضافة</button>
    </div>}
    <div className="list-group">{filtered.map(s=><div key={s.id} className="list-group-item bg-card border-military d-flex justify-content-between align-items-center"><span>{s.name}</span>{user?.role==='commander'&&<button onClick={()=>del(s.id)} className="btn btn-sm btn-outline-danger py-0">✕</button>}</div>)}
      {filtered.length===0&&<p className="text-muted-military small mb-0">لا توجد تخصصات</p>}
    </div>
  </div>);
}
function RanksSettings({ranks,rankTypes,onRefresh,user}){
  return(<div className="card border-military p-3">
    <h6 className="text-gold mb-2">أنواع الرتب</h6>
    <div className="table-responsive mb-3"><table className="table table-sm"><thead><tr className="text-gold small"><th>النوع</th><th>الرتب</th></tr></thead><tbody>
      {rankTypes.map(rt=><tr key={rt.id}><td className="small"><span className="badge px-2 py-1" style={{background:rt.color?`${rt.color}30`:'transparent',color:rt.color||'var(--military-text)'}}>{rt.name}</span></td><td className="small">{ranks.filter(r=>r.type_id===rt.id).sort((a,b)=>a.sort_order-b.sort_order).map(r=>r.name).join(' ← ')}</td></tr>)}
    </tbody></table></div>
    <h6 className="text-gold mb-2">جميع الرتب</h6>
    <div className="table-responsive"><table className="table table-sm"><thead><tr className="text-gold small"><th>الرتبة</th><th>النوع</th><th>ترتيب التقييم</th></tr></thead><tbody>
      {ranks.sort((a,b)=>a.sort_order-b.sort_order).map(r=><tr key={r.id}><td className="small">{r.name}</td><td className="small">{rankTypes.find(rt=>rt.id===r.type_id)?.name||'-'}</td><td className="small">{r.sort_order}</td></tr>)}
    </tbody></table></div>
    <p className="small text-muted-military mb-0">ملاحظة: الرتبة ذات رقم الترتيب الأعلى يمكنها تقييم الرتبة ذات الرقم الأقل. القائد يمكنه تقييم الجميع.</p>
  </div>);
}
function UsersPage({users,ranks,onRefresh,user}){
  const[showForm,setShowForm]=useState(false);
  return(<div>
    <div className="d-flex justify-content-between align-items-center mb-3"><h4 className="text-gold mb-0">المستخدمين</h4>{user?.role==='commander'&&<button onClick={()=>setShowForm(true)} className="btn btn-gold btn-sm">+ إضافة مستخدم</button>}</div>
    <div className="table-responsive"><table className="table table-sm table-hover"><thead><tr className="text-gold small"><th>#</th><th>الاسم</th><th>اسم المستخدم</th><th>الدور</th><th>الرتبة</th><th>الحالة</th><th></th></tr></thead><tbody>
      {users.map((u,i)=><tr key={u.id} className={u.is_active?'':'opacity-50'}><td className="small">{i+1}</td><td className="small">{u.name}</td><td className="small">{u.username}</td><td className="small"><span className="badge bg-dark border border-military">{u.role}</span></td><td className="small">{u.rank_name||'-'}</td><td className="small">{u.is_active?'🟢 نشط':'🔴 معطل'}</td><td className="small">{user?.role==='commander'&&<div className="d-flex gap-1">
        <button onClick={()=>{const p=prompt('كلمة المرور الجديدة');if(p)api.updateUserPassword(u.id,p).then(()=>onRefresh()).catch(e=>alert(e.message))}} className="btn btn-sm btn-outline-gold py-0" style={{fontSize:'0.65rem'}} title="تغيير كلمة المرور">🔑</button>
        <button onClick={()=>api.toggleUser(u.id).then(()=>onRefresh()).catch(e=>alert(e.message))} className="btn btn-sm btn-outline-secondary py-0" style={{fontSize:'0.65rem'}} title={u.is_active?'تعطيل':'تفعيل'}>{u.is_active?'🔒':'🔓'}</button>
        <button onClick={()=>{if(confirm('حذف المستخدم؟'))api.deleteUser(u.id).then(()=>onRefresh()).catch(e=>alert(e.message))}} className="btn btn-sm btn-outline-danger py-0" style={{fontSize:'0.65rem'}} title="حذف">✕</button>
      </div>}</td></tr>)}
      {users.length===0&&<tr><td colSpan={7} className="text-center text-muted-military small py-3">لا توجد نتائج</td></tr>}
    </tbody></table></div>
    {showForm&&<UserForm ranks={ranks} onClose={()=>{setShowForm(false);onRefresh()}}/>}
  </div>);
}
const ROLE_LABELS={commander:'قائد',officer:'ضابط',nco:'صف ضابط'};
const PERMISSIONS={
  commander:{label:'صلاحية كاملة',color:'var(--military-gold-bright)',perms:[
    {action:'إدارة المستخدمين',allowed:true},{action:'إدارة الأسلحة والتخصصات',allowed:true},{action:'حذف أي بيانات',allowed:true},
    {action:'منح الأوسمة',allowed:true},{action:'إضافة/تعديل أفراد',allowed:true},{action:'إضافة نتائج',allowed:true},
    {action:'إنشاء امتحانات',allowed:true},{action:'إعلانات',allowed:true},{action:'مشاهدة الإشعارات',allowed:true},
  ]},
  officer:{label:'صلاحية ضابط',color:'#2D6A4F',perms:[
    {action:'إدارة المستخدمين',allowed:false},{action:'إدارة الأسلحة والتخصصات',allowed:false},{action:'حذف أي بيانات',allowed:false},
    {action:'منح الأوسمة',allowed:false},{action:'إضافة/تعديل أفراد',allowed:true},{action:'إضافة نتائج',allowed:true},
    {action:'إنشاء امتحانات',allowed:true},{action:'إعلانات',allowed:true},{action:'مشاهدة الإشعارات',allowed:true},
  ]},
  nco:{label:'صلاحية صف ضابط',color:'#C9A84C',perms:[
    {action:'إدارة المستخدمين',allowed:false},{action:'إدارة الأسلحة والتخصصات',allowed:false},{action:'حذف أي بيانات',allowed:false},
    {action:'منح الأوسمة',allowed:false},{action:'إضافة/تعديل أفراد',allowed:false},{action:'إضافة نتائج',allowed:true},
    {action:'إنشاء امتحانات',allowed:false},{action:'إعلانات',allowed:false},{action:'مشاهدة الإشعارات',allowed:true},
  ]},
};
const PAGE_LABELS={
  dashboard:'الرئيسية',soldiers:'الأفراد',exams:'الامتحانات',results:'النتائج',
  notifications:'الإشعارات',announcements:'الإعلانات',users:'المستخدمين',settings:'الإعدادات',profile:'حسابي'
};
function UserForm({ranks,onClose}){
  const[name,setName]=useState('');const[username,setUsername]=useState('');const[password,setPassword]=useState('');
  const[role,setRole]=useState('officer');const[rankId,setRankId]=useState('');
  const[pages,setPages]=useState(Object.keys(PAGE_LABELS).filter(k=>!['users','settings'].includes(k)));
  const perm=PERMISSIONS[role];
  function togglePage(id){setPages(p=>p.includes(id)?p.filter(x=>x!==id):[...p,id])}
  async function save(){if(!name||!username||!password)return;try{await api.createUser({name,username,password,role,rankId:rankId||null,permissions:{pages}});onClose()}catch(e){alert(e.message)}}
  return(<Modal onClose={onClose}><h5 className="text-gold mb-3">إضافة مستخدم</h5>
    <input placeholder="الاسم" value={name} onChange={e=>setName(e.target.value)} className="form-control bg-card text-light border-military mb-2"/>
    <input placeholder="اسم المستخدم" value={username} onChange={e=>setUsername(e.target.value)} className="form-control bg-card text-light border-military mb-2"/>
    <input type="password" placeholder="كلمة المرور" value={password} onChange={e=>setPassword(e.target.value)} className="form-control bg-card text-light border-military mb-2"/>
    <select value={role} onChange={e=>setRole(e.target.value)} className="form-select bg-card text-light border-military mb-2">
      {['commander','officer','nco'].map(r=><option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
    </select>
    <select value={rankId} onChange={e=>setRankId(e.target.value)} className="form-select bg-card text-light border-military mb-2">
      <option value="">اختر الرتبة (اختياري)</option>{ranks.map(r=><option key={r.id} value={r.id}>{r.name}</option>)}
    </select>
    {/* Page permissions */}
    <div className="card border-military p-2 mb-2"><h6 className="text-gold small mb-2" style={{fontSize:'0.75rem'}}>📄 الصفحات المسموح بها</h6>
      <div className="d-flex flex-wrap gap-2">{Object.entries(PAGE_LABELS).filter(([k])=>k!=='profile').map(([k,v])=><label key={k} className="d-flex align-items-center gap-1 small" style={{fontSize:'0.7rem',cursor:'pointer'}}>
        <input type="checkbox" checked={pages.includes(k)} onChange={()=>togglePage(k)} style={{accentColor:'var(--military-gold-bright)'}}/>{v}</label>)}</div>
    </div>
    {/* Role info */}
    <div className="card border-military p-2 mb-3"><h6 className="text-gold small mb-2" style={{fontSize:'0.75rem'}}>🔒 صلاحية الدور: {perm.label}</h6>
      <table className="table table-borderless table-sm mb-0"><tbody>
        {perm.perms.map(p=><tr key={p.action}><td className="small py-1" style={{fontSize:'0.7rem'}}>{p.action}</td><td className="text-start py-1">{p.allowed?<span className="text-success" style={{fontSize:'0.7rem'}}>✅ مسموح</span>:<span className="text-danger" style={{fontSize:'0.7rem'}}>❌ غير مسموح</span>}</td></tr>)}
      </tbody></table>
    </div>
    <div className="d-flex gap-2"><button onClick={save} className="btn btn-gold flex-grow-1">إنشاء</button><button onClick={onClose} className="btn btn-outline-secondary flex-grow-1">إلغاء</button></div>
  </Modal>);
}

function ProfilePage({user}){
  return(<div className="card border-military p-3" style={{maxWidth:500}}>
    <h5 className="text-gold mb-3">👤 حسابي</h5>
    <table className="table table-borderless table-sm mb-0"><tbody>
      {[{l:'الاسم',v:user?.name},{l:'اسم المستخدم',v:user?.username},{l:'الدور',v:{commander:'قائد',officer:'ضابط',nco:'صف ضابط'}[user?.role]},{l:'الرتبة',v:user?.rank_name||'-'}].map(r=><tr key={r.l}><td className="text-muted-military small py-1" style={{width:120}}>{r.l}</td><td className="small py-1">{r.v}</td></tr>)}
    </tbody></table>
  </div>);
}

function Modal({children,onClose,width}){
  return(<div className="position-fixed d-flex align-items-center justify-content-center" style={{inset:0,zIndex:1050,background:'rgba(0,0,0,0.6)'}} onClick={onClose}>
    <div className="bg-card border border-military rounded p-3 m-2" style={{maxWidth:width||400,width:'100%',maxHeight:'85vh',overflowY:'auto'}} onClick={e=>e.stopPropagation()}>{children}</div>
  </div>);
}
