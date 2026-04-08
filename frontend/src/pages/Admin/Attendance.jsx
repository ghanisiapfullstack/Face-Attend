import { useEffect, useState } from 'react';
import Sidebar from '../../components/Sidebar';
import api from '../../utils/api';

export default function AdminAttendance() {
  const [attendances, setAttendances] = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [filterDate,  setFilterDate]  = useState('');
  const [deleting,    setDeleting]    = useState(null); // id yang sedang dihapus
  const [toast,       setToast]       = useState('');

  const fetchData = async () => {
    try {
      const r = await api.get('/api/attendance/all');
      setAttendances(r.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const handleDelete = async (id) => {
    if (!confirm('Hapus data absensi ini? Mahasiswa bisa scan ulang setelah dihapus.')) return;
    setDeleting(id);
    try {
      await api.delete(`/api/attendance/${id}`);
      setAttendances(prev => prev.filter(a => a.id !== id));
      showToast('Data absensi berhasil dihapus.');
    } catch (e) {
      showToast('Gagal menghapus. Pastikan endpoint DELETE /api/attendance/{id} tersedia di backend.');
    } finally { setDeleting(null); }
  };

  const filtered = filterDate
    ? attendances.filter(a =>
        new Date(a.check_in_time).toLocaleDateString('id-ID') ===
        new Date(filterDate).toLocaleDateString('id-ID'))
    : attendances;

  const totalHadir     = filtered.filter(a => a.status === 'hadir').length;
  const totalTerlambat = filtered.filter(a => a.status === 'terlambat').length;

  return (
    <div className="layout">
      <Sidebar />
      <div className="main-content">

        {/* Toast */}
        {toast && (
          <div style={{
            position: 'fixed', top: 20, right: 24, zIndex: 99,
            background: 'var(--surface)', border: '1px solid var(--border2)',
            borderRadius: 9, padding: '11px 18px', fontSize: 13,
            color: 'var(--text-1)', boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
            animation: 'slideUp 0.2s ease',
          }}>
            {toast}
          </div>
        )}

        <div style={{ marginBottom: 24 }}>
          <p className="page-title">Data Absensi</p>
          <p className="page-sub">Monitor & kelola semua data kehadiran mahasiswa</p>
        </div>

        {/* Stat cards */}
        <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: 18 }}>
          {[
            { label: 'Total Hadir',     value: totalHadir,     color: 'var(--green)' },
            { label: 'Total Terlambat', value: totalTerlambat, color: 'var(--amber)' },
            { label: 'Total Absensi',   value: filtered.length, color: 'var(--blue)' },
          ].map(s => (
            <div key={s.label} className="stat-card">
              <div className="stat-label">{s.label}</div>
              <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Filter */}
        <div className="filter-bar">
          <div>
            <label className="input-label">Filter Tanggal</label>
            <input
              type="date" className="input" style={{ width: 'auto' }}
              value={filterDate} onChange={e => setFilterDate(e.target.value)}
            />
          </div>
          {filterDate && (
            <button className="btn btn-ghost btn-sm" onClick={() => setFilterDate('')} style={{ alignSelf: 'flex-end' }}>
              Reset
            </button>
          )}
          <div style={{ marginLeft: 'auto', alignSelf: 'flex-end' }}>
            <span style={{ fontSize: 12, color: 'var(--text-3)' }}>
              {filtered.length} data {filterDate ? 'pada tanggal ini' : 'total'}
            </span>
          </div>
        </div>

        {/* Table */}
        <div className="card">
          {loading ? (
            <div className="empty-state">Memuat data...</div>
          ) : filtered.length === 0 ? (
            <div className="empty-state">Tidak ada data absensi</div>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>NIM</th>
                    <th>Nama</th>
                    <th>Mata Kuliah</th>
                    <th>Jadwal</th>
                    <th>Waktu</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((a, i) => (
                    <tr key={a.id}>
                      <td style={{ color: 'var(--text-3)' }}>{i + 1}</td>
                      <td style={{ fontWeight: 500, color: 'var(--text-1)' }}>{a.student_nim}</td>
                      <td>{a.student_name}</td>
                      <td>{a.course_name || '—'}</td>
                      <td style={{ fontSize: 12 }}>{a.schedule || '—'}</td>
                      <td style={{ fontSize: 12 }}>{new Date(a.check_in_time).toLocaleString('id-ID')}</td>
                      <td>
                        <span className={`badge ${a.status === 'hadir' ? 'badge-green' : 'badge-amber'}`}>
                          {a.status === 'hadir' ? 'Hadir' : 'Terlambat'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          className="btn btn-danger-soft btn-sm"
                          onClick={() => handleDelete(a.id)}
                          disabled={deleting === a.id}
                          style={{ opacity: deleting === a.id ? 0.5 : 1 }}
                        >
                          {deleting === a.id ? '...' : 'Hapus'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <style>{`@keyframes slideUp { from { opacity:0; transform:translateY(-8px); } to { opacity:1; transform:translateY(0); } }`}</style>
      </div>
    </div>
  );
}
