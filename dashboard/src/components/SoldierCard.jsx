export default function SoldierCard({soldier:s,onDistinguish,onClick}){
  const isGold=s.distinction_badge==='gold';
  return(<div className="col-6 col-md-3">
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
