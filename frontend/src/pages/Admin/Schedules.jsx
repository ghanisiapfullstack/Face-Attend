import { useEffect, useState } from 'react';
import Sidebar from '../../components/Sidebar';
import api from '../../utils/api';

export default function AdminSchedules() {
  const [schedules, setSchedules] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ course_id: '', day: '', start_time: '', end_time: '', room: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchData = async () => {
    try {
      const [sr, cr] = await Promise.all([api.get('/api/schedules'), api.get('/api/courses')]);
      setSchedules(sr.data); setCourses(cr.data);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };
  useEffect(() => { fetchData(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault(); setError('');
    try {
      await api.post('/api/schedules', form);
      setSuccess('Jadwal berhasil ditambahkan!');
      setShowModal(false); setForm({ course_id: '', day: '', start_time: '', end_time: '', room: '' }); fetchData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (e) { setError(e.response?.data?.detail || 'Gagal menambahkan jadwal'); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Yakin hapus jadwal ini?')) return;
    try { await api.delete(`/api/schedules/${id}`); fetchData(); } catch (e) { console.error(e); }
  };

  const dayColors = { Senin:'badge-blue', Selasa:'badge-purple', Rabu:'badge-green', Kamis:'badge-amber', Jumat:'badge-red' };

  return (
    <div className="layout">
      <Sidebar />
      <div className="main-content">
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
          <div>
            <p className="page-title">Jadwal Kelas</p>
            <p className="page-sub">Kelola jadwal mata kuliah</p>
          </div>
          <button className="btn btn-primary" onClick={() => { setShowModal(true); setError(''); }}>+ Tambah</button>
        </div>

        {success && <div className="alert alert-green">{success}</div>}

        <div className="card">
          {loading ? <div className="empty-state">Memuat data...</div>
          : schedules.length === 0 ? <div className="empty-state">Belum ada jadwal</div>
          : (
            <div className="table-wrap">
              <table className="data-table">
                <thead><tr><th>#</th><th>Mata Kuliah</th><th>Hari</th><th>Jam</th><th>Ruangan</th><th></th></tr></thead>
                <tbody>
                  {schedules.map((s, i) => (
                    <tr key={s.id}>
                      <td style={{ color: 'var(--text-3)' }}>{i + 1}</td>
                      <td style={{ fontWeight: 500, color: 'var(--text-1)' }}>{s.course_name}</td>
                      <td><span className={`badge ${dayColors[s.day] || 'badge-blue'}`}>{s.day}</span></td>
                      <td style={{ fontSize: 12 }}>{s.start_time} – {s.end_time}</td>
                      <td>{s.room}</td>
                      <td><button className="btn btn-danger-soft btn-sm" onClick={() => handleDelete(s.id)}>Hapus</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {showModal && (
          <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
            <div className="modal">
              <h2 className="modal-title">Tambah Jadwal</h2>
              {error && <div className="alert alert-red">{error}</div>}
              <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: 14 }}>
                  <label className="input-label">Mata Kuliah</label>
                  <select className="select-field input" value={form.course_id} onChange={e => setForm({...form, course_id: e.target.value})} required>
                    <option value="">Pilih Mata Kuliah</option>
                    {courses.map(c => <option key={c.id} value={c.id}>{c.code} – {c.name}</option>)}
                  </select>
                </div>
                <div style={{ marginBottom: 14 }}>
                  <label className="input-label">Hari</label>
                  <select className="select-field input" value={form.day} onChange={e => setForm({...form, day: e.target.value})} required>
                    <option value="">Pilih Hari</option>
                    {['Senin','Selasa','Rabu','Kamis','Jumat'].map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                  <div>
                    <label className="input-label">Jam Mulai</label>
                    <input type="time" className="input" value={form.start_time} onChange={e => setForm({...form, start_time: e.target.value})} required />
                  </div>
                  <div>
                    <label className="input-label">Jam Selesai</label>
                    <input type="time" className="input" value={form.end_time} onChange={e => setForm({...form, end_time: e.target.value})} required />
                  </div>
                </div>
                <div style={{ marginBottom: 14 }}>
                  <label className="input-label">Ruangan</label>
                  <input type="text" className="input" value={form.room} onChange={e => setForm({...form, room: e.target.value})} required />
                </div>
                <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                  <button type="submit" className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }}>Simpan</button>
                  <button type="button" className="btn btn-ghost" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setShowModal(false)}>Batal</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
