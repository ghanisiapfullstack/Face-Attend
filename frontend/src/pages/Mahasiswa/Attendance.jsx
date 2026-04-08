import { useEffect, useState } from 'react';
import Sidebar from '../../components/Sidebar';
import api from '../../utils/api';

export default function MahasiswaAttendance() {
  const [attendances, setAttendances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterDate, setFilterDate] = useState('');
  const [filterCourse, setFilterCourse] = useState('');

  useEffect(() => {
    api.get('/api/attendance/my').then(r => setAttendances(r.data)).catch(console.error).finally(() => setLoading(false));
  }, []);

  const courses = [...new Set(attendances.map(a => a.course_name).filter(Boolean))];
  const filtered = attendances.filter(a => {
    const matchDate = filterDate ? new Date(a.check_in_time).toLocaleDateString('id-ID') === new Date(filterDate).toLocaleDateString('id-ID') : true;
    return matchDate && (filterCourse ? a.course_name === filterCourse : true);
  });
  const totalHadir = filtered.filter(a => a.status === 'hadir').length;
  const totalTerlambat = filtered.filter(a => a.status === 'terlambat').length;

  return (
    <div className="layout">
      <Sidebar />
      <div className="main-content">
        <div style={{ marginBottom: 28 }}>
          <p className="page-title">Riwayat Absensi</p>
          <p className="page-sub">Riwayat kehadiran kamu</p>
        </div>

        <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: 20 }}>
          {[
            { label: 'Total Hadir', value: totalHadir, color: 'var(--green)' },
            { label: 'Total Terlambat', value: totalTerlambat, color: 'var(--amber)' },
            { label: 'Total Absensi', value: filtered.length, color: 'var(--blue)' },
          ].map(s => (
            <div key={s.label} className="stat-card">
              <div className="stat-label">{s.label}</div>
              <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
            </div>
          ))}
        </div>

        <div className="filter-bar">
          <div>
            <label className="input-label">Mata Kuliah</label>
            <select className="select-field" style={{ width: 'auto' }} value={filterCourse} onChange={e => setFilterCourse(e.target.value)}>
              <option value="">Semua</option>
              {courses.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="input-label">Tanggal</label>
            <input type="date" className="input" style={{ width: 'auto' }} value={filterDate} onChange={e => setFilterDate(e.target.value)} />
          </div>
          {(filterDate || filterCourse) && (
            <button className="btn btn-ghost btn-sm" onClick={() => { setFilterDate(''); setFilterCourse(''); }} style={{ alignSelf: 'flex-end' }}>Reset</button>
          )}
        </div>

        <div className="card">
          {loading ? <div className="empty-state">Memuat data...</div>
          : filtered.length === 0 ? <div className="empty-state">Tidak ada data absensi</div>
          : (
            <div className="table-wrap">
              <table className="data-table">
                <thead><tr><th>#</th><th>Mata Kuliah</th><th>Jadwal</th><th>Waktu</th><th>Status</th></tr></thead>
                <tbody>
                  {filtered.map((a, i) => (
                    <tr key={a.id}>
                      <td style={{ color: 'var(--text-3)' }}>{i + 1}</td>
                      <td style={{ fontWeight: 500, color: 'var(--text-1)' }}>{a.course_name || '—'}</td>
                      <td style={{ fontSize: 12 }}>{a.schedule || '—'}</td>
                      <td style={{ fontSize: 12 }}>{new Date(a.check_in_time).toLocaleString('id-ID')}</td>
                      <td><span className={`badge ${a.status === 'hadir' ? 'badge-green' : 'badge-amber'}`}>{a.status === 'hadir' ? 'Hadir' : 'Terlambat'}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
