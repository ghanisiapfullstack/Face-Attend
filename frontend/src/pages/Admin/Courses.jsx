import { useEffect, useState } from 'react';
import Sidebar from '../../components/Sidebar';
import api from '../../utils/api';

export default function AdminCourses() {
  const [courses, setCourses] = useState([]);
  const [lecturers, setLecturers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ code: '', name: '', lecturer_id: '', credits: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchData = async () => {
    try {
      const [cr, lr] = await Promise.all([api.get('/api/courses'), api.get('/api/users/lecturers')]);
      setCourses(cr.data); setLecturers(lr.data);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };
  useEffect(() => { fetchData(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault(); setError('');
    try {
      await api.post('/api/courses', form);
      setSuccess('Mata kuliah berhasil ditambahkan!');
      setShowModal(false); setForm({ code: '', name: '', lecturer_id: '', credits: '' }); fetchData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (e) { setError(e.response?.data?.detail || 'Gagal menambahkan mata kuliah'); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Yakin hapus mata kuliah ini?')) return;
    try { await api.delete(`/api/courses/${id}`); fetchData(); } catch (e) { console.error(e); }
  };

  return (
    <div className="layout">
      <Sidebar />
      <div className="main-content">
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
          <div>
            <p className="page-title">Mata Kuliah</p>
            <p className="page-sub">Kelola data mata kuliah</p>
          </div>
          <button className="btn btn-primary" onClick={() => { setShowModal(true); setError(''); }}>+ Tambah</button>
        </div>

        {success && <div className="alert alert-green">{success}</div>}

        <div className="card">
          {loading ? <div className="empty-state">Memuat data...</div>
          : courses.length === 0 ? <div className="empty-state">Belum ada data mata kuliah</div>
          : (
            <div className="table-wrap">
              <table className="data-table">
                <thead><tr><th>#</th><th>Kode</th><th>Nama</th><th>Dosen</th><th>SKS</th><th></th></tr></thead>
                <tbody>
                  {courses.map((c, i) => (
                    <tr key={c.id}>
                      <td style={{ color: 'var(--text-3)' }}>{i + 1}</td>
                      <td><span className="badge badge-purple">{c.code}</span></td>
                      <td style={{ fontWeight: 500, color: 'var(--text-1)' }}>{c.name}</td>
                      <td>{c.lecturer_name}</td>
                      <td>{c.credits} SKS</td>
                      <td><button className="btn btn-danger-soft btn-sm" onClick={() => handleDelete(c.id)}>Hapus</button></td>
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
              <h2 className="modal-title">Tambah Mata Kuliah</h2>
              {error && <div className="alert alert-red">{error}</div>}
              <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: 14 }}>
                  <label className="input-label">Kode</label>
                  <input type="text" className="input" value={form.code} onChange={e => setForm({...form, code: e.target.value})} required />
                </div>
                <div style={{ marginBottom: 14 }}>
                  <label className="input-label">Nama Mata Kuliah</label>
                  <input type="text" className="input" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
                </div>
                <div style={{ marginBottom: 14 }}>
                  <label className="input-label">Dosen Pengampu</label>
                  <select className="select-field input" value={form.lecturer_id} onChange={e => setForm({...form, lecturer_id: e.target.value})} required>
                    <option value="">Pilih Dosen</option>
                    {lecturers.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                  </select>
                </div>
                <div style={{ marginBottom: 14 }}>
                  <label className="input-label">SKS</label>
                  <input type="number" className="input" value={form.credits} onChange={e => setForm({...form, credits: e.target.value})} required />
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
