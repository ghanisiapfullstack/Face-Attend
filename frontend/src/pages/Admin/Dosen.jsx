import { useEffect, useState } from 'react';
import Sidebar from '../../components/Sidebar';
import api from '../../utils/api';

export default function AdminDosen() {
  const [lecturers, setLecturers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ nip: '', name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetch = async () => {
    try { const r = await api.get('/api/users/lecturers'); setLecturers(r.data); }
    catch (e) { console.error(e); } finally { setLoading(false); }
  };
  useEffect(() => { fetch(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault(); setError('');
    try {
      await api.post('/api/users/lecturers', form);
      setSuccess('Dosen berhasil ditambahkan!');
      setShowModal(false); setForm({ nip: '', name: '', email: '', password: '' }); fetch();
      setTimeout(() => setSuccess(''), 3000);
    } catch (e) { setError(e.response?.data?.detail || 'Gagal menambahkan dosen'); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Yakin hapus dosen ini?')) return;
    try { await api.delete(`/api/users/lecturers/${id}`); fetch(); } catch (e) { console.error(e); }
  };

  return (
    <div className="layout">
      <Sidebar />
      <div className="main-content">
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
          <div>
            <p className="page-title">Data Dosen</p>
            <p className="page-sub">Kelola data dosen pengampu</p>
          </div>
          <button className="btn btn-primary" onClick={() => { setShowModal(true); setError(''); }}>+ Tambah</button>
        </div>

        {success && <div className="alert alert-green">{success}</div>}

        <div className="card">
          {loading ? <div className="empty-state">Memuat data...</div>
          : lecturers.length === 0 ? <div className="empty-state">Belum ada data dosen</div>
          : (
            <div className="table-wrap">
              <table className="data-table">
                <thead><tr><th>#</th><th>NIP</th><th>Nama</th><th>Email</th><th></th></tr></thead>
                <tbody>
                  {lecturers.map((l, i) => (
                    <tr key={l.id}>
                      <td style={{ color: 'var(--text-3)' }}>{i + 1}</td>
                      <td style={{ fontWeight: 500, color: 'var(--text-1)' }}>{l.nip}</td>
                      <td>{l.name}</td>
                      <td style={{ fontSize: 12 }}>{l.email}</td>
                      <td><button className="btn btn-danger-soft btn-sm" onClick={() => handleDelete(l.id)}>Hapus</button></td>
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
              <h2 className="modal-title">Tambah Dosen</h2>
              {error && <div className="alert alert-red">{error}</div>}
              <form onSubmit={handleSubmit}>
                {[['nip','NIP','text'],['name','Nama Lengkap','text'],['email','Email','email'],['password','Password','password']].map(([k,l,t]) => (
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
