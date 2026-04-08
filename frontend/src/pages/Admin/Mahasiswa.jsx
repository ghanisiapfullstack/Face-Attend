import { useEffect, useState } from 'react';
import Sidebar from '../../components/Sidebar';
import api from '../../utils/api';

export default function AdminMahasiswa() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ nim: '', name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetch = async () => {
    try { const r = await api.get('/api/users/students'); setStudents(r.data); }
    catch (e) { console.error(e); } finally { setLoading(false); }
  };
  useEffect(() => { fetch(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault(); setError('');
    try {
      await api.post('/api/users/students', form);
      setSuccess('Mahasiswa berhasil ditambahkan!');
      setShowModal(false); setForm({ nim: '', name: '', email: '', password: '' }); fetch();
      setTimeout(() => setSuccess(''), 3000);
    } catch (e) { setError(e.response?.data?.detail || 'Gagal menambahkan mahasiswa'); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Yakin hapus mahasiswa ini?')) return;
    try { await api.delete(`/api/users/students/${id}`); fetch(); } catch (e) { console.error(e); }
  };

  return (
    <div className="layout">
      <Sidebar />
      <div className="main-content">
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
          <div>
            <p className="page-title">Data Mahasiswa</p>
            <p className="page-sub">Kelola data mahasiswa terdaftar</p>
          </div>
          <button className="btn btn-primary" onClick={() => { setShowModal(true); setError(''); }}>
            + Tambah
          </button>
        </div>

        {success && <div className="alert alert-green">{success}</div>}

        <div className="card">
          {loading ? <div className="empty-state">Memuat data...</div>
          : students.length === 0 ? <div className="empty-state">Belum ada data mahasiswa</div>
          : (
            <div className="table-wrap">
              <table className="data-table">
                <thead><tr><th>#</th><th>NIM</th><th>Nama</th><th>Email</th><th></th></tr></thead>
                <tbody>
                  {students.map((s, i) => (
                    <tr key={s.id}>
                      <td style={{ color: 'var(--text-3)' }}>{i + 1}</td>
                      <td style={{ fontWeight: 500, color: 'var(--text-1)' }}>{s.nim}</td>
                      <td>{s.name}</td>
                      <td style={{ fontSize: 12 }}>{s.email}</td>
                      <td>
                        <button className="btn btn-danger-soft btn-sm" onClick={() => handleDelete(s.id)}>Hapus</button>
                      </td>
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
              <h2 className="modal-title">Tambah Mahasiswa</h2>
              {error && <div className="alert alert-red">{error}</div>}
              <form onSubmit={handleSubmit}>
                {[['nim','NIM','text'],['name','Nama Lengkap','text'],['email','Email','email'],['password','Password','password']].map(([k,l,t]) => (
                  <div key={k} style={{ marginBottom: 14 }}>
                    <label className="input-label">{l}</label>
                    <input type={t} className="input" value={form[k]} onChange={e => setForm({...form,[k]:e.target.value})} required />
                  </div>
                ))}
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
