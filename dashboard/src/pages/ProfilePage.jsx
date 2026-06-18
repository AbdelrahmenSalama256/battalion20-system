import { useState } from 'react';
import { api } from '../api';

export default function ProfilePage({ user, onUpdate }) {
  const [name, setName] = useState(user?.name || '');
  const [oldPass, setOldPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);

  async function changePassword() {
    if (!oldPass || !newPass) return;
    setLoading(true);
    setMsg('');
    try {
      await api.changePassword(oldPass, newPass);
      setMsg('تم تغيير كلمة المرور بنجاح');
      setOldPass('');
      setNewPass('');
    } catch (e) {
      setMsg(e.message);
    }
    setLoading(false);
  }

  return (
    <div>
      <h4 className="text-gold mb-4">حسابي</h4>

      <div className="card border-military p-3 mb-3" style={{ maxWidth: 400 }}>
        <h6 className="text-gold mb-3">المعلومات</h6>
        <div className="mb-2">
          <label className="form-label small text-muted-military">الاسم</label>
          <div className="form-control bg-card text-light border-military">{user?.name}</div>
        </div>
        <div className="mb-2">
          <label className="form-label small text-muted-military">اسم المستخدم</label>
          <div className="form-control bg-card text-light border-military">{user?.username}</div>
        </div>
        <div className="mb-2">
          <label className="form-label small text-muted-military">الدور</label>
          <div className="form-control bg-card text-light border-military">
            {user?.role === 'commander' ? 'قائد' : user?.role === 'officer' ? 'ضابط' : 'صف ضابط'}
          </div>
        </div>
        {user?.rank_name && (
          <div className="mb-2">
            <label className="form-label small text-muted-military">الرتبة</label>
            <div className="form-control bg-card text-light border-military">{user?.rank_name}</div>
          </div>
        )}
      </div>

      <div className="card border-military p-3" style={{ maxWidth: 400 }}>
        <h6 className="text-gold mb-3">تغيير كلمة المرور</h6>
        <input type="password" placeholder="كلمة المرور القديمة" value={oldPass} onChange={e => setOldPass(e.target.value)}
          className="form-control bg-card text-light border-military mb-2" />
        <input type="password" placeholder="كلمة المرور الجديدة" value={newPass} onChange={e => setNewPass(e.target.value)}
          className="form-control bg-card text-light border-military mb-2" />
        {msg && <div className={`small mb-2 ${msg.includes('نجاح') ? 'text-success' : 'text-danger'}`}>{msg}</div>}
        <button onClick={changePassword} disabled={loading || !oldPass || !newPass}
          className="btn btn-gold btn-sm">
          {loading ? 'جاري...' : 'تغيير كلمة المرور'}
        </button>
      </div>
    </div>
  );
}
