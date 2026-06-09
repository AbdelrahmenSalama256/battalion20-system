import React, { useState, useEffect, useCallback } from 'react';
import { api } from './api';

const COLORS = {
  gold: '#C9A84C', bg: '#0A0F07', card: '#111A0A',
  cardBorder: '#1E2D14', textPrimary: '#F5F5DC', textSecondary: '#9CAF88',
  danger: '#E63946', success: '#2D6A4F', warning: '#E9C46A',
};

function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('b20_token'));
  const [page, setPage] = useState('login');
  const [stats, setStats] = useState(null);
  const [soldiers, setSoldiers] = useState([]);
  const [exams, setExams] = useState([]);
  const [results, setResults] = useState([]);
  const [weapons, setWeapons] = useState([]);
  const [specialties, setSpecialties] = useState([]);
  const [rankTypes, setRankTypes] = useState([]);
  const [ranks, setRanks] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [fitnessExercises, setFitnessExercises] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');

  useEffect(() => {
    if (token) {
      loadUser();
      loadAllData();
    }
  }, [token]);

  async function loadUser() {
    try {
      const u = await api.me();
      setUser(u);
      if (page === 'login') setPage('dashboard');
    } catch {
      localStorage.removeItem('b20_token');
      setToken(null);
      setUser(null);
      setPage('login');
    }
  }

  async function loadAllData() {
    setLoading(true);
    try {
      const [s, sold, ex, res, wp, sp, rt, rk, ann, fit] = await Promise.all([
        api.getStats().catch(() => null),
        api.getSoldiers({}).catch(() => []),
        api.getExams({}).catch(() => []),
        api.getResults({}).catch(() => ({ results: [] })),
        api.getWeapons().catch(() => []),
        api.getSpecialties().catch(() => []),
        api.getRankTypes().catch(() => []),
        api.getRanks().catch(() => []),
        api.getAnnouncements().catch(() => []),
        api.getFitnessExercises().catch(() => []),
      ]);
      if (s) setStats(s);
      setSoldiers(sold);
      setExams(ex);
      setResults(res.results || []);
      setWeapons(wp);
      setSpecialties(sp);
      setRankTypes(rt);
      setRanks(rk);
      setAnnouncements(ann);
      setFitnessExercises(fit);
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  function handleLogin(username, password) {
    api.login(username, password).then(({ token: t, user: u }) => {
      localStorage.setItem('b20_token', t);
      setToken(t);
      setUser(u);
      setPage('dashboard');
    }).catch(e => alert(e.message));
  }

  function handleLogout() {
    localStorage.removeItem('b20_token');
    setToken(null);
    setUser(null);
    setPage('login');
  }

  if (page === 'login') {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <div style={{ background: COLORS.bg, minHeight: '100vh', color: COLORS.textPrimary, fontFamily: 'Tajawal, sans-serif' }}>
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} user={user} onLogout={handleLogout} />
      <main style={{ marginRight: 240, padding: 20 }}>
        {activeTab === 'dashboard' && <DashboardPage stats={stats} loading={loading} onRefresh={loadAllData} />}
        {activeTab === 'soldiers' && <SoldiersPage soldiers={soldiers} weapons={weapons} specialties={specialties} rankTypes={rankTypes} ranks={ranks} onRefresh={loadAllData} user={user} />}
        {activeTab === 'exams' && <ExamsPage exams={exams} weapons={weapons} onRefresh={loadAllData} user={user} />}
        {activeTab === 'results' && <ResultsPage results={results} soldiers={soldiers} exams={exams} onRefresh={loadAllData} user={user} />}
        {activeTab === 'fitness' && <FitnessPage exercises={fitnessExercises} soldiers={soldiers} onRefresh={loadAllData} user={user} />}
        {activeTab === 'announcements' && <AnnouncementsPage announcements={announcements} onRefresh={loadAllData} user={user} />}
        {activeTab === 'users' && user?.role === 'commander' && <UsersPage users={users} onRefresh={loadAllData} />}
      </main>
    </div>
  );
}

// ========== LOGIN ==========
function LoginPage({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      await onLogin(username, password);
    } catch { setLoading(false); }
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: COLORS.bg }}>
      <div style={{ background: COLORS.card, border: `1px solid ${COLORS.cardBorder}`, borderRadius: 16, padding: 40, width: 360 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>🛡️</div>
          <h1 style={{ color: COLORS.gold, margin: 0, fontSize: 28 }}>كتيبة 20</h1>
          <p style={{ color: COLORS.textSecondary, fontSize: 14 }}>نظام التقييم العسكري</p>
        </div>
        <form onSubmit={handleSubmit}>
          <input placeholder="اسم المستخدم" value={username} onChange={e => setUsername(e.target.value)}
            style={{ ...inputStyle, marginBottom: 12 }} />
          <input type="password" placeholder="كلمة المرور" value={password} onChange={e => setPassword(e.target.value)}
            style={{ ...inputStyle, marginBottom: 24 }} />
          <button type="submit" disabled={loading} style={{ ...btnStyle, width: '100%' }}>
            {loading ? 'جاري التحميل...' : 'تسجيل الدخول'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ========== SIDEBAR ==========
function Sidebar({ activeTab, onTabChange, user, onLogout }) {
  const tabs = [
    { id: 'dashboard', label: 'الرئيسية', icon: '📊' },
    { id: 'soldiers', label: 'الأفراد', icon: '👥' },
    { id: 'exams', label: 'الامتحانات', icon: '📝' },
    { id: 'results', label: 'النتائج', icon: '🏆' },
    { id: 'fitness', label: 'اللياقة', icon: '💪' },
    { id: 'announcements', label: 'الإعلانات', icon: '📢' },
  ];
  if (user?.role === 'commander') tabs.push({ id: 'users', label: 'المستخدمين', icon: '👤' });

  return (
    <div style={{ position: 'fixed', right: 0, top: 0, bottom: 0, width: 240, background: COLORS.card, borderLeft: `1px solid ${COLORS.cardBorder}`, padding: 20, display: 'flex', flexDirection: 'column' }}>
      <div style={{ textAlign: 'center', marginBottom: 32, padding: 16 }}>
        <div style={{ fontSize: 40 }}>🛡️</div>
        <h2 style={{ color: COLORS.gold, margin: '8px 0', fontSize: 18 }}>كتيبة 20</h2>
        <div style={{ color: COLORS.textSecondary, fontSize: 12 }}>{user?.name}</div>
      </div>
      {tabs.map(t => (
        <button key={t.id} onClick={() => onTabChange(t.id)}
          style={{
            ...sidebarBtnStyle,
            background: activeTab === t.id ? `${COLORS.gold}20` : 'transparent',
            borderRight: activeTab === t.id ? `3px solid ${COLORS.gold}` : '3px solid transparent',
          }}>
          <span style={{ marginLeft: 10 }}>{t.icon}</span>
          {t.label}
        </button>
      ))}
      <div style={{ flex: 1 }} />
      <button onClick={onLogout} style={{ ...sidebarBtnStyle, color: COLORS.danger }}>
        <span style={{ marginLeft: 10 }}>🚪</span>تسجيل الخروج
      </button>
    </div>
  );
}

// ========== DASHBOARD ==========
function DashboardPage({ stats, loading, onRefresh }) {
  if (loading || !stats) {
    return <div style={{ textAlign: 'center', padding: 40, color: COLORS.textSecondary }}>جاري تحميل البيانات...</div>;
  }

  const dist = stats.distribution || { excellent: 0, veryGood: 0, good: 0, acceptable: 0, fail: 0 };
  const totalDist = dist.excellent + dist.veryGood + dist.good + dist.acceptable + dist.fail;
  const recentResults = stats.recentResults || [];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ color: COLORS.gold, margin: 0 }}>لوحة القيادة</h1>
        <button onClick={onRefresh} style={smallBtnStyle}>🔄 تحديث</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'الأفراد', value: stats.totalSoldiers, icon: '👥', color: COLORS.gold },
          { label: 'النتائج', value: stats.totalResults, icon: '🏆', color: COLORS.success },
          { label: 'المعدل', value: `${stats.avgScore}%`, icon: '📈', color: '#4FC3F7' },
          { label: 'النجاح', value: `${stats.passRate}%`, icon: '✅', color: '#66BB6A' },
        ].map(card => (
          <div key={card.label} style={{ background: COLORS.card, border: `1px solid ${COLORS.cardBorder}`, borderRadius: 12, padding: 20, textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>{card.icon}</div>
            <div style={{ fontSize: 28, fontWeight: 'bold', color: card.color }}>{card.value}</div>
            <div style={{ color: COLORS.textSecondary, fontSize: 14 }}>{card.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        <div style={{ background: COLORS.card, border: `1px solid ${COLORS.cardBorder}`, borderRadius: 12, padding: 20 }}>
          <h3 style={{ color: COLORS.gold, margin: '0 0 16px' }}>توزيع الدرجات</h3>
          {totalDist > 0 ? (
            ['excellent', 'veryGood', 'good', 'acceptable', 'fail'].map(k => {
              const labels = { excellent: 'ممتاز', veryGood: 'جيد جداً', good: 'جيد', acceptable: 'مقبول', fail: 'راسب' };
              const colors = { excellent: '#1B8A2E', veryGood: '#2D6A4F', good: COLORS.gold, acceptable: COLORS.warning, fail: COLORS.danger };
              const pct = ((dist[k] / totalDist) * 100).toFixed(1);
              return (
                <div key={k} style={{ marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span>{labels[k]}</span>
                    <span style={{ color: colors[k] }}>{dist[k]} ({pct}%)</span>
                  </div>
                  <div style={{ height: 8, background: COLORS.cardBorder, borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: colors[k], borderRadius: 4, transition: 'width 0.3s' }} />
                  </div>
                </div>
              );
            })
          ) : <div style={{ color: COLORS.textSecondary }}>لا توجد نتائج بعد</div>}
        </div>

        <div style={{ background: COLORS.card, border: `1px solid ${COLORS.cardBorder}`, borderRadius: 12, padding: 20 }}>
          <h3 style={{ color: COLORS.gold, margin: '0 0 16px' }}>حسب السلاح</h3>
          {(stats.byWeapon || []).map(w => (
            <div key={w.weapon_name} style={{ display: 'flex', alignItems: 'center', marginBottom: 12, padding: '8px 0', borderBottom: `1px solid ${COLORS.cardBorder}` }}>
              <span style={{ fontSize: 24, marginLeft: 12 }}>{w.weapon_icon || '⚔️'}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 'bold' }}>{w.weapon_name}</div>
                <div style={{ fontSize: 12, color: COLORS.textSecondary }}>{w.count} فرد</div>
              </div>
              <ScoreBadge score={w.avg} />
            </div>
          ))}
        </div>
      </div>

      <div style={{ background: COLORS.card, border: `1px solid ${COLORS.cardBorder}`, borderRadius: 12, padding: 20 }}>
        <h3 style={{ color: COLORS.gold, margin: '0 0 16px' }}>آخر النتائج</h3>
        {recentResults.map(r => (
          <div key={r.id} style={{ display: 'flex', alignItems: 'center', padding: '8px 0', borderBottom: `1px solid ${COLORS.cardBorder}` }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 'bold' }}>{r.soldier_name}</div>
              <div style={{ fontSize: 12, color: COLORS.textSecondary }}>{r.exam_title || ''}</div>
            </div>
            <ScoreBadge score={r.total_score} />
          </div>
        ))}
      </div>
    </div>
  );
}

function ScoreBadge({ score }) {
  const color = score >= 90 ? '#1B8A2E' : score >= 75 ? '#2D6A4F' : score >= 65 ? COLORS.gold : score >= 50 ? COLORS.warning : COLORS.danger;
  const label = score >= 90 ? 'ممتاز' : score >= 75 ? 'جيد جداً' : score >= 65 ? 'جيد' : score >= 50 ? 'مقبول' : 'راسب';
  return (
    <span style={{
      background: `${color}30`, color, padding: '4px 12px', borderRadius: 12,
      border: `1px solid ${color}80`, fontSize: 12, fontWeight: 'bold',
      whiteSpace: 'nowrap',
    }}>
      {label} {score.toFixed(1)}%
    </span>
  );
}

// ========== SOLDIERS ==========
function SoldiersPage({ soldiers, weapons, specialties, rankTypes, ranks, onRefresh, user }) {
  const [search, setSearch] = useState('');
  const [weaponFilter, setWeaponFilter] = useState('');
  const [editSoldier, setEditSoldier] = useState(null);

  const filtered = soldiers.filter(s => {
    if (search && !s.name.includes(search) && !s.military_id?.includes(search)) return false;
    if (weaponFilter && s.weapon_id !== weaponFilter) return false;
    return true;
  });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h1 style={{ color: COLORS.gold, margin: 0 }}>الأفراد</h1>
        <button onClick={() => setEditSoldier({})} style={btnStyle}>+ إضافة جندي</button>
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <input placeholder="بحث..." value={search} onChange={e => setSearch(e.target.value)} style={{ ...inputStyle, flex: 1 }} />
        <select value={weaponFilter} onChange={e => setWeaponFilter(e.target.value)} style={{ ...inputStyle, width: 160 }}>
          <option value="">الكل</option>
          {weapons.map(w => <option key={w.id} value={w.id}>{w.icon} {w.name}</option>)}
        </select>
      </div>
      <div style={{ display: 'grid', gap: 8 }}>
        {filtered.map(s => (
          <div key={s.id} style={{ background: COLORS.card, border: `1px solid ${COLORS.cardBorder}`, borderRadius: 8, padding: '12px 16px', display: 'flex', alignItems: 'center' }}>
            <div style={{ fontSize: 24, marginLeft: 12 }}>{s.weapon_icon || '👤'}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 'bold' }}>{s.name}</div>
              <div style={{ fontSize: 12, color: COLORS.textSecondary }}>{s.rank_name || ''} • {s.weapon_name || ''} • {s.specialty_name || ''}</div>
            </div>
            <button onClick={() => setEditSoldier(s)} style={smallBtnStyle}>✏️ تعديل</button>
          </div>
        ))}
      </div>
      {editSoldier && (
        <SoldierForm soldier={editSoldier} weapons={weapons} specialties={specialties} rankTypes={rankTypes} ranks={ranks}
          onClose={() => { setEditSoldier(null); onRefresh(); }} />
      )}
    </div>
  );
}

function SoldierForm({ soldier, weapons, specialties: allSpecialties, rankTypes, ranks, onClose }) {
  const [name, setName] = useState(soldier.name || '');
  const [militaryId, setMilitaryId] = useState(soldier.military_id || '');
  const [weaponId, setWeaponId] = useState(soldier.weapon_id || '');
  const [specialtyId, setSpecialtyId] = useState(soldier.specialty_id || '');
  const [rankId, setRankId] = useState(soldier.rank_id || '');
  const [notes, setNotes] = useState(soldier.notes || '');
  const [specialties, setSpecialties] = useState(allSpecialties);

  useEffect(() => {
    if (weaponId) {
      api.getSpecialties(weaponId).then(setSpecialties).catch(() => {});
    }
  }, [weaponId]);

  async function save() {
    const data = { name, militaryId, weaponId, specialtyId, rankId, notes };
    try {
      if (soldier.id) await api.updateSoldier(soldier.id, data);
      else await api.createSoldier(data);
      onClose();
    } catch (e) { alert(e.message); }
  }

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
      <div style={{ background: COLORS.card, border: `1px solid ${COLORS.gold}`, borderRadius: 12, padding: 24, width: 400, maxHeight: '90vh', overflow: 'auto' }}>
        <h2 style={{ color: COLORS.gold, margin: '0 0 16px' }}>{soldier.id ? 'تعديل جندي' : 'إضافة جندي'}</h2>
        <input placeholder="الاسم" value={name} onChange={e => setName(e.target.value)} style={{ ...inputStyle, marginBottom: 8 }} />
        <input placeholder="الرقم العسكري" value={militaryId} onChange={e => setMilitaryId(e.target.value)} style={{ ...inputStyle, marginBottom: 8 }} />
        <select value={weaponId} onChange={e => setWeaponId(e.target.value)} style={{ ...inputStyle, marginBottom: 8 }}>
          <option value="">اختر السلاح</option>
          {weapons.map(w => <option key={w.id} value={w.id}>{w.icon} {w.name}</option>)}
        </select>
        <select value={specialtyId} onChange={e => setSpecialtyId(e.target.value)} style={{ ...inputStyle, marginBottom: 8 }}>
          <option value="">اختر التخصص</option>
          {specialties.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select value={rankId} onChange={e => setRankId(e.target.value)} style={{ ...inputStyle, marginBottom: 8 }}>
          <option value="">اختر الرتبة</option>
          {ranks.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
        <textarea placeholder="ملاحظات" value={notes} onChange={e => setNotes(e.target.value)} rows={3} style={{ ...inputStyle, marginBottom: 16 }} />
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={save} style={{ ...btnStyle, flex: 1 }}>حفظ</button>
          <button onClick={onClose} style={{ ...btnStyle, flex: 1, background: 'transparent', border: `1px solid ${COLORS.cardBorder}`, color: COLORS.textSecondary }}>إلغاء</button>
        </div>
      </div>
    </div>
  );
}

// ========== EXAMS ==========
function ExamsPage({ exams, weapons, onRefresh, user }) {
  const [typeFilter, setTypeFilter] = useState('');
  const [showForm, setShowForm] = useState(false);

  const filtered = exams.filter(e => !typeFilter || e.type === typeFilter);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h1 style={{ color: COLORS.gold, margin: 0 }}>الامتحانات</h1>
        <button onClick={() => setShowForm(true)} style={btnStyle}>+ إنشاء امتحان</button>
      </div>
      <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} style={{ ...inputStyle, marginBottom: 16, width: 200 }}>
        <option value="">الكل</option>
        <option value="general">عام</option>
        <option value="weapon">سلاح</option>
        <option value="specialty">تخصص</option>
      </select>
      <div style={{ display: 'grid', gap: 8 }}>
        {filtered.map(e => (
          <div key={e.id} style={{ background: COLORS.card, border: `1px solid ${COLORS.cardBorder}`, borderRadius: 8, padding: '12px 16px', display: 'flex', alignItems: 'center' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 'bold' }}>{e.title}</div>
              <div style={{ fontSize: 12, color: COLORS.textSecondary }}>{e.type} • {e.item_count} بند • {e.result_count} نتيجة</div>
            </div>
            {e.avg_score != null && <ScoreBadge score={e.avg_score} />}
          </div>
        ))}
      </div>
      {showForm && <ExamForm weapons={weapons} onClose={() => { setShowForm(false); onRefresh(); }} />}
    </div>
  );
}

function ExamForm({ weapons, onClose }) {
  const [title, setTitle] = useState('');
  const [type, setType] = useState('general');
  const [weaponId, setWeaponId] = useState('');
  const [itemsText, setItemsText] = useState('');

  async function save() {
    const items = itemsText.split('\n').filter(l => l.trim()).map(l => {
      const parts = l.split('|');
      return { text: parts[0].trim(), maxScore: parseFloat(parts[1]) || 10 };
    });
    if (!title || !items.length) return;
    try {
      await api.createExam({ title, type, weaponId: type === 'weapon' ? weaponId : null, items });
      onClose();
    } catch (e) { alert(e.message); }
  }

  return (
    <Modal onClose={onClose}>
      <h2 style={{ color: COLORS.gold, margin: '0 0 16px' }}>إنشاء امتحان</h2>
      <input placeholder="عنوان الامتحان" value={title} onChange={e => setTitle(e.target.value)} style={{ ...inputStyle, marginBottom: 8 }} />
      <select value={type} onChange={e => setType(e.target.value)} style={{ ...inputStyle, marginBottom: 8 }}>
        <option value="general">عام</option>
        <option value="weapon">سلاح</option>
        <option value="specialty">تخصص</option>
      </select>
      {type === 'weapon' && (
        <select value={weaponId} onChange={e => setWeaponId(e.target.value)} style={{ ...inputStyle, marginBottom: 8 }}>
          <option value="">اختر السلاح</option>
          {weapons.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
        </select>
      )}
      <textarea placeholder="البند الأول | 10&#10;البند الثاني | 15" value={itemsText} onChange={e => setItemsText(e.target.value)} rows={5} style={{ ...inputStyle, marginBottom: 16 }} />
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={save} style={{ ...btnStyle, flex: 1 }}>إنشاء</button>
        <button onClick={onClose} style={{ ...btnStyle, flex: 1, background: 'transparent', border: `1px solid ${COLORS.cardBorder}`, color: COLORS.textSecondary }}>إلغاء</button>
      </div>
    </Modal>
  );
}

// ========== RESULTS ==========
function ResultsPage({ results, soldiers, exams, onRefresh, user }) {
  const [showForm, setShowForm] = useState(false);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h1 style={{ color: COLORS.gold, margin: 0 }}>النتائج</h1>
        <button onClick={() => setShowForm(true)} style={btnStyle}>+ إضافة نتيجة</button>
      </div>
      <div style={{ display: 'grid', gap: 8 }}>
        {results.map(r => (
          <div key={r.id} style={{ background: COLORS.card, border: `1px solid ${COLORS.cardBorder}`, borderRadius: 8, padding: '12px 16px', display: 'flex', alignItems: 'center' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 'bold' }}>{r.soldier_name}</div>
              <div style={{ fontSize: 12, color: COLORS.textSecondary }}>{r.exam_title || ''} • {r.exam_date || ''}</div>
            </div>
            <ScoreBadge score={r.total_score} />
          </div>
        ))}
      </div>
      {showForm && <ResultForm soldiers={soldiers} exams={exams} onClose={() => { setShowForm(false); onRefresh(); }} />}
    </div>
  );
}

function ResultForm({ soldiers, exams, onClose }) {
  const [soldierId, setSoldierId] = useState('');
  const [examId, setExamId] = useState('');
  const [examItems, setExamItems] = useState([]);
  const [scores, setScores] = useState({});

  useEffect(() => {
    if (examId) {
      api.getExam(examId).then(exam => {
        setExamItems(exam.items || []);
        const s = {};
        exam.items?.forEach(item => s[item.id] = '');
        setScores(s);
      }).catch(() => {});
    }
  }, [examId]);

  function calcTotal() {
    let got = 0, max = 0;
    examItems.forEach(item => {
      const val = parseFloat(scores[item.id]) || 0;
      got += val;
      max += item.max_score;
    });
    return max > 0 ? (got / max) * 100 : 0;
  }

  async function save() {
    const scoresArr = examItems.map(item => ({
      itemId: item.id,
      value: parseFloat(scores[item.id]) || 0,
    }));
    try {
      await api.createResult({ examId, soldierId, scores: scoresArr });
      onClose();
    } catch (e) { alert(e.message); }
  }

  return (
    <Modal onClose={onClose}>
      <h2 style={{ color: COLORS.gold, margin: '0 0 16px' }}>إضافة نتيجة</h2>
      <select value={soldierId} onChange={e => setSoldierId(e.target.value)} style={{ ...inputStyle, marginBottom: 8 }}>
        <option value="">اختر الجندي</option>
        {soldiers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
      </select>
      <select value={examId} onChange={e => setExamId(e.target.value)} style={{ ...inputStyle, marginBottom: 16 }}>
        <option value="">اختر الامتحان</option>
        {exams.map(e => <option key={e.id} value={e.id}>{e.title}</option>)}
      </select>
      {examItems.map(item => (
        <div key={item.id} style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 13, marginBottom: 4, color: COLORS.textSecondary }}>{item.text} (القصوى: {item.max_score})</div>
          <input type="number" value={scores[item.id] || ''} onChange={e => setScores({...scores, [item.id]: e.target.value})}
            style={{ ...inputStyle }} />
        </div>
      ))}
      {examItems.length > 0 && (
        <div style={{ marginBottom: 16, padding: 12, background: `${COLORS.gold}15`, borderRadius: 8 }}>
          <ScoreBadge score={calcTotal()} /> <span style={{ marginRight: 8, color: COLORS.textSecondary }}>المجموع</span>
        </div>
      )}
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={save} style={{ ...btnStyle, flex: 1 }}>حفظ</button>
        <button onClick={onClose} style={{ ...btnStyle, flex: 1, background: 'transparent', border: `1px solid ${COLORS.cardBorder}`, color: COLORS.textSecondary }}>إلغاء</button>
      </div>
    </Modal>
  );
}

// ========== FITNESS ==========
function FitnessPage({ exercises, soldiers, onRefresh, user }) {
  const [showForm, setShowForm] = useState(false);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h1 style={{ color: COLORS.gold, margin: 0 }}>اللياقة البدنية</h1>
        <button onClick={() => setShowForm(true)} style={btnStyle}>+ إضافة نتيجة</button>
      </div>
      <div style={{ display: 'grid', gap: 8 }}>
        {exercises.map(ex => (
          <div key={ex.id} style={{ background: COLORS.card, border: `1px solid ${COLORS.cardBorder}`, borderRadius: 8, padding: '12px 16px', display: 'flex', alignItems: 'center' }}>
            <div style={{ fontSize: 24, marginLeft: 12 }}>💪</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 'bold' }}>{ex.name}</div>
              <div style={{ fontSize: 12, color: COLORS.textSecondary }}>الوحدة: {ex.unit || '-'} • علامة النجاح: {ex.pass_mark}</div>
            </div>
          </div>
        ))}
      </div>
      {showForm && <FitnessResultForm exercises={exercises} soldiers={soldiers} onClose={() => { setShowForm(false); onRefresh(); }} />}
    </div>
  );
}

function FitnessResultForm({ exercises, soldiers, onClose }) {
  const [soldierId, setSoldierId] = useState('');
  const [values, setValues] = useState({});

  useEffect(() => {
    const v = {};
    exercises.forEach(ex => v[ex.id] = '');
    setValues(v);
  }, []);

  async function save() {
    const results = exercises.map(ex => ({
      exerciseId: ex.id,
      value: parseFloat(values[ex.id]) || 0,
    }));
    try {
      await api.createFitnessResult({ soldierId, results });
      onClose();
    } catch (e) { alert(e.message); }
  }

  return (
    <Modal onClose={onClose}>
      <h2 style={{ color: COLORS.gold, margin: '0 0 16px' }}>نتيجة لياقة</h2>
      <select value={soldierId} onChange={e => setSoldierId(e.target.value)} style={{ ...inputStyle, marginBottom: 16 }}>
        <option value="">اختر الجندي</option>
        {soldiers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
      </select>
      {exercises.map(ex => (
        <div key={ex.id} style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 13, marginBottom: 4, color: COLORS.textSecondary }}>{ex.name} ({ex.unit || ''})</div>
          <input type="number" value={values[ex.id] || ''} onChange={e => setValues({...values, [ex.id]: e.target.value})} style={{ ...inputStyle }} />
        </div>
      ))}
      <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
        <button onClick={save} style={{ ...btnStyle, flex: 1 }}>حفظ</button>
        <button onClick={onClose} style={{ ...btnStyle, flex: 1, background: 'transparent', border: `1px solid ${COLORS.cardBorder}`, color: COLORS.textSecondary }}>إلغاء</button>
      </div>
    </Modal>
  );
}

// ========== ANNOUNCEMENTS ==========
function AnnouncementsPage({ announcements, onRefresh, user }) {
  const [showForm, setShowForm] = useState(false);

  const priorityColors = { urgent: COLORS.danger, info: COLORS.success, normal: COLORS.textSecondary };
  const priorityLabels = { urgent: 'عاجل', info: 'معلومات', normal: 'عادي' };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h1 style={{ color: COLORS.gold, margin: 0 }}>الإعلانات</h1>
        {user?.role === 'commander' && <button onClick={() => setShowForm(true)} style={btnStyle}>+ إعلان جديد</button>}
      </div>
      <div style={{ display: 'grid', gap: 8 }}>
        {announcements.map(a => (
          <div key={a.id} style={{ background: COLORS.card, border: `1px solid ${COLORS.cardBorder}`, borderRadius: 8, padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ background: `${priorityColors[a.priority]}30`, color: priorityColors[a.priority], padding: '2px 10px', borderRadius: 8, fontSize: 11, fontWeight: 'bold', marginLeft: 8 }}>
                {priorityLabels[a.priority]}
              </span>
              <span style={{ fontWeight: 'bold', fontSize: 16 }}>{a.title}</span>
            </div>
            {a.body && <div style={{ color: COLORS.textSecondary, fontSize: 14, marginBottom: 8 }}>{a.body}</div>}
            <div style={{ fontSize: 11, color: COLORS.textSecondary }}>{a.created_by_name} • {a.created_at?.substring(0, 10)}</div>
          </div>
        ))}
      </div>
      {showForm && <AnnouncementForm onClose={() => { setShowForm(false); onRefresh(); }} />}
    </div>
  );
}

function AnnouncementForm({ onClose }) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [priority, setPriority] = useState('normal');

  async function save() {
    if (!title) return;
    try {
      await api.createAnnouncement({ title, body, priority });
      onClose();
    } catch (e) { alert(e.message); }
  }

  return (
    <Modal onClose={onClose}>
      <h2 style={{ color: COLORS.gold, margin: '0 0 16px' }}>إعلان جديد</h2>
      <input placeholder="العنوان" value={title} onChange={e => setTitle(e.target.value)} style={{ ...inputStyle, marginBottom: 8 }} />
      <textarea placeholder="المحتوى" value={body} onChange={e => setBody(e.target.value)} rows={4} style={{ ...inputStyle, marginBottom: 8 }} />
      <select value={priority} onChange={e => setPriority(e.target.value)} style={{ ...inputStyle, marginBottom: 16 }}>
        <option value="normal">عادي</option>
        <option value="info">معلومات</option>
        <option value="urgent">عاجل</option>
      </select>
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={save} style={{ ...btnStyle, flex: 1 }}>نشر</button>
        <button onClick={onClose} style={{ ...btnStyle, flex: 1, background: 'transparent', border: `1px solid ${COLORS.cardBorder}`, color: COLORS.textSecondary }}>إلغاء</button>
      </div>
    </Modal>
  );
}

// ========== USERS ==========
function UsersPage({ users: usersList, onRefresh }) {
  const [showForm, setShowForm] = useState(false);

  useEffect(() => { if (!usersList.length) onRefresh(); }, []);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h1 style={{ color: COLORS.gold, margin: 0 }}>المستخدمين</h1>
        <button onClick={() => setShowForm(true)} style={btnStyle}>+ إضافة مستخدم</button>
      </div>
      <div style={{ display: 'grid', gap: 8 }}>
        {usersList.map(u => (
          <div key={u.id} style={{ background: COLORS.card, border: `1px solid ${COLORS.cardBorder}`, borderRadius: 8, padding: '12px 16px', display: 'flex', alignItems: 'center' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 'bold' }}>{u.name}</div>
              <div style={{ fontSize: 12, color: COLORS.textSecondary }}>@{u.username} • {u.role} • {u.is_active ? 'نشط' : 'موقوف'}</div>
            </div>
          </div>
        ))}
      </div>
      {showForm && <UserForm onClose={() => { setShowForm(false); onRefresh(); }} />}
    </div>
  );
}

function UserForm({ onClose }) {
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('officer');

  async function save() {
    if (!name || !username || !password) return;
    try {
      await api.createUser({ name, username, password, role });
      onClose();
    } catch (e) { alert(e.message); }
  }

  return (
    <Modal onClose={onClose}>
      <h2 style={{ color: COLORS.gold, margin: '0 0 16px' }}>مستخدم جديد</h2>
      <input placeholder="الاسم" value={name} onChange={e => setName(e.target.value)} style={{ ...inputStyle, marginBottom: 8 }} />
      <input placeholder="اسم المستخدم" value={username} onChange={e => setUsername(e.target.value)} style={{ ...inputStyle, marginBottom: 8 }} />
      <input type="password" placeholder="كلمة المرور" value={password} onChange={e => setPassword(e.target.value)} style={{ ...inputStyle, marginBottom: 8 }} />
      <select value={role} onChange={e => setRole(e.target.value)} style={{ ...inputStyle, marginBottom: 16 }}>
        <option value="officer">ضابط</option>
        <option value="nco">ضابط صف</option>
        <option value="commander">قائد</option>
      </select>
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={save} style={{ ...btnStyle, flex: 1 }}>إضافة</button>
        <button onClick={onClose} style={{ ...btnStyle, flex: 1, background: 'transparent', border: `1px solid ${COLORS.cardBorder}`, color: COLORS.textSecondary }}>إلغاء</button>
      </div>
    </Modal>
  );
}

// ========== COMMON COMPONENTS ==========
function Modal({ children, onClose }) {
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
      <div style={{ background: COLORS.card, border: `1px solid ${COLORS.gold}`, borderRadius: 12, padding: 24, width: 400, maxHeight: '90vh', overflow: 'auto' }}>
        {children}
      </div>
    </div>
  );
}

const inputStyle = {
  width: '100%', padding: '10px 14px', borderRadius: 8, border: `1px solid ${COLORS.cardBorder}`,
  background: '#0D1508', color: COLORS.textPrimary, fontSize: 14, fontFamily: 'Tajawal, sans-serif',
  outline: 'none', boxSizing: 'border-box',
};

const btnStyle = {
  padding: '10px 24px', borderRadius: 8, border: 'none', background: COLORS.gold,
  color: COLORS.bg, fontSize: 14, fontWeight: 'bold', cursor: 'pointer', fontFamily: 'Tajawal, sans-serif',
};

const smallBtnStyle = {
  padding: '6px 14px', borderRadius: 6, border: `1px solid ${COLORS.gold}`,
  background: 'transparent', color: COLORS.gold, fontSize: 12, cursor: 'pointer', fontFamily: 'Tajawal, sans-serif',
};

const sidebarBtnStyle = {
  width: '100%', padding: '12px 16px', borderRadius: 8, border: 'none',
  color: COLORS.textPrimary, fontSize: 14, cursor: 'pointer', textAlign: 'right',
  fontFamily: 'Tajawal, sans-serif', marginBottom: 4,
};

export default App;
