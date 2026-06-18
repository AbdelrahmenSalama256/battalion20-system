import { useState, useEffect } from 'react';
import { api } from '../api';
import Modal from '../components/Modal';

const TABS = [
  { key: 'specialties', label: 'التخصصات' },
  { key: 'weapons', label: 'الأسلحة' },
  { key: 'ranks', label: 'الرتب' },
  { key: 'rankTypes', label: 'أنواع الرتب' },
];

export default function ManagePage({ user }) {
  const [activeTab, setActiveTab] = useState('specialties');

  if (user?.role !== 'commander') return null;

  return (
    <div>
      <h4 className="text-gold mb-3">الإدارة</h4>

      <ul className="nav nav-tabs mb-3">
        {TABS.map(t => (
          <li key={t.key} className="nav-item">
            <button className={`nav-link ${activeTab === t.key ? 'active' : ''}`}
              onClick={() => setActiveTab(t.key)}
              style={{ color: activeTab === t.key ? 'var(--military-gold-bright)' : 'var(--military-text-muted)' }}>
              {t.label}
            </button>
          </li>
        ))}
      </ul>

      {activeTab === 'specialties' && <SpecialtiesManager />}
      {activeTab === 'weapons' && <WeaponsManager />}
      {activeTab === 'ranks' && <RanksManager />}
      {activeTab === 'rankTypes' && <RankTypesManager />}
    </div>
  );
}

/* ─── Specialties ─── */
function SpecialtiesManager() {
  const [items, setItems] = useState([]);
  const [showForm, setShowForm] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);
  async function load() {
    setLoading(true);
    try { setItems(await api.getSpecialties()); } catch (e) { console.error(e); }
    setLoading(false);
  }

  async function handleDelete(id) {
    if (!confirm('حذف التخصص؟')) return;
    await api.deleteSpecialty(id);
    load();
  }

  function render() {
    if (loading) return <div className="text-center p-3 text-muted-military">جاري التحميل...</div>;
    return (
      <div>
        <button onClick={() => setShowForm({})} className="btn btn-gold btn-sm mb-2">+ إضافة تخصص</button>
        <div className="table-responsive">
          <table className="table table-sm table-hover border-military">
            <thead><tr className="text-gold small"><th>الاسم</th><th>الوصف</th><th>الحالة</th><th></th></tr></thead>
            <tbody>
              {items.map(i => (
                <tr key={i.id}>
                  <td className="small">{i.name}</td>
                  <td className="small text-muted-military">{i.description || '-'}</td>
                  <td><span className={`badge ${i.is_active ? 'bg-success' : 'bg-secondary'}`}>{i.is_active ? 'نشط' : 'غير نشط'}</span></td>
                  <td className="d-flex gap-1">
                    <button className="btn btn-sm btn-outline-gold py-0 px-1" onClick={() => setShowForm(i)}>✏️</button>
                    <button className="btn btn-sm btn-outline-danger py-0 px-1" onClick={() => handleDelete(i.id)}>🗑️</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {showForm != null && (
          <ItemForm item={showForm} fields={[
            { key: 'name', label: 'الاسم', type: 'text' },
            { key: 'description', label: 'الوصف', type: 'textarea' },
            { key: 'isActive', label: 'نشط', type: 'checkbox' },
          ]}
            onSave={async (data) => {
              if (showForm.id) await api.updateSpecialty(showForm.id, data);
              else await api.createSpecialty(data);
            }}
            onClose={() => setShowForm(null)} onDone={load} />
        )}
      </div>
    );
  }
  return render();
}

/* ─── Weapons ─── */
function WeaponsManager() {
  const [items, setItems] = useState([]);
  const [showForm, setShowForm] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);
  async function load() {
    setLoading(true);
    try { setItems(await api.getWeapons()); } catch (e) { console.error(e); }
    setLoading(false);
  }

  async function handleDelete(id) {
    if (!confirm('حذف السلاح؟')) return;
    await api.deleteWeapon(id);
    load();
  }

  if (loading) return <div className="text-center p-3 text-muted-military">جاري التحميل...</div>;
  return (
    <div>
      <button onClick={() => setShowForm({})} className="btn btn-gold btn-sm mb-2">+ إضافة سلاح</button>
      <div className="table-responsive">
        <table className="table table-sm table-hover border-military">
          <thead><tr className="text-gold small"><th>الأيقونة</th><th>الاسم</th><th>الوصف</th><th></th></tr></thead>
          <tbody>
            {items.map(i => (
              <tr key={i.id}>
                <td className="small">{i.icon || '-'}</td>
                <td className="small">{i.name}</td>
                <td className="small text-muted-military">{i.description || '-'}</td>
                <td><button className="btn btn-sm btn-outline-danger py-0 px-1" onClick={() => handleDelete(i.id)}>🗑️</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {showForm != null && (
        <ItemForm item={showForm} fields={[
          { key: 'name', label: 'الاسم', type: 'text' },
          { key: 'icon', label: 'الأيقونة', type: 'text' },
          { key: 'description', label: 'الوصف', type: 'textarea' },
        ]}
          onSave={async (data) => { await api.createWeapon(data); }}
          onClose={() => setShowForm(null)} onDone={load} />
      )}
    </div>
  );
}

/* ─── Ranks ─── */
function RanksManager() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);
  async function load() {
    setLoading(true);
    try { setItems(await api.getRanks()); } catch (e) { console.error(e); }
    setLoading(false);
  }

  if (loading) return <div className="text-center p-3 text-muted-military">جاري التحميل...</div>;
  return (
    <div>
      <div className="small text-muted-military mb-2">الرتب المحددة في النظام (للقراءة فقط)</div>
      <div className="table-responsive">
        <table className="table table-sm table-hover border-military">
          <thead><tr className="text-gold small"><th>الاسم</th><th>المستوى</th><th>النوع</th><th>الترتيب</th></tr></thead>
          <tbody>
            {items.map(i => (
              <tr key={i.id}>
                <td className="small">{i.name}</td>
                <td className="small">{i.level}</td>
                <td className="small">{i.type_name || '-'}</td>
                <td className="small">{i.sort_order}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ─── Rank Types ─── */
function RankTypesManager() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);
  async function load() {
    setLoading(true);
    try { setItems(await api.getRankTypes()); } catch (e) { console.error(e); }
    setLoading(false);
  }

  if (loading) return <div className="text-center p-3 text-muted-military">جاري التحميل...</div>;
  return (
    <div>
      <div className="small text-muted-military mb-2">أنواع الرتب (للقراءة فقط)</div>
      <div className="table-responsive">
        <table className="table table-sm table-hover border-military">
          <thead><tr className="text-gold small"><th>الاسم</th></tr></thead>
          <tbody>
            {items.map(i => (
              <tr key={i.id}><td className="small">{i.name}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ─── Generic Item Form ─── */
function ItemForm({ item, fields, onSave, onClose, onDone }) {
  const [form, setForm] = useState(() => {
    const init = {};
    fields.forEach(f => {
      init[f.key] = item[f.key] ?? (f.type === 'checkbox' ? true : '');
    });
    return init;
  });

  async function save() {
    try {
      await onSave(form);
      onDone();
      onClose();
    } catch (e) { alert(e.message); }
  }

  return (
    <Modal onClose={onClose}>
      <h5 className="text-gold mb-3">{item.id ? 'تعديل' : 'إضافة'}</h5>
      {fields.map(f => (
        <div key={f.key} className="mb-2">
          {f.type === 'checkbox' ? (
            <div className="form-check">
              <input type="checkbox" checked={form[f.key]} onChange={e => setForm(fa => ({ ...fa, [f.key]: e.target.checked }))}
                className="form-check-input" id={`f-${f.key}`} />
              <label className="form-check-label text-light small" htmlFor={`f-${f.key}`}>{f.label}</label>
            </div>
          ) : f.type === 'textarea' ? (
            <>
              <label className="form-label small text-muted-military">{f.label}</label>
              <textarea value={form[f.key]} onChange={e => setForm(fa => ({ ...fa, [f.key]: e.target.value }))}
                className="form-control bg-card text-light border-military" rows={3} />
            </>
          ) : (
            <>
              <label className="form-label small text-muted-military">{f.label}</label>
              <input type="text" value={form[f.key]} onChange={e => setForm(fa => ({ ...fa, [f.key]: e.target.value }))}
                className="form-control bg-card text-light border-military" />
            </>
          )}
        </div>
      ))}
      <div className="d-flex gap-2 mt-3">
        <button onClick={save} className="btn btn-gold flex-grow-1">حفظ</button>
        <button onClick={onClose} className="btn btn-outline-secondary flex-grow-1">إلغاء</button>
      </div>
    </Modal>
  );
}
