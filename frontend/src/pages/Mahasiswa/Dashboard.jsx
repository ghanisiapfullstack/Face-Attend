import { useEffect, useState } from 'react';
import Sidebar from '../../components/Sidebar';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';

export default function MahasiswaDashboard() {
  const { user } = useAuth();
  const [attendances, setAttendances] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/api/attendance/my').then(r => setAttendances(r.data)).catch(console.error).finally(() => setLoading(false));
  }, []);

  const totalHadir = attendances.filter(a => a.status === 'hadir').length;
  const totalTerlambat = attendances.filter(a => a.status === 'terlambat').length;
  const courses = [...new Set(attendances.map(a => a.course_name).filter(Boolean))];

  const courseStats = courses.map(course => {
    const ca = attendances.filter(a => a.course_name === course);
    const hadir = ca.filter(a => a.status === 'hadir').length;
    const pct = Math.round((hadir / ca.length) * 100);
    return { course, total: ca.length, hadir, pct };
  });

  const avg = courseStats.length > 0
    ? Math.round(courseStats.reduce((acc, c) => acc + c.pct, 0) / courseStats.length) : 0;

  const getBadge = (pct) => pct >= 80 ? { cls: 'badge-green', label: 'Aman' }
    : pct >= 60 ? { cls: 'badge-amber', label: 'Perhatian' }
    : { cls: 'badge-red', label: 'Bahaya' };

  const getBarColor = (pct) => pct >= 80 ? 'var(--green)' : pct >= 60 ? 'var(--amber)' : 'var(--red)';

  return (
    <div className="layout">
      <Sidebar />
      <div className="main-content">
        <div style={{ marginBottom: 28 }}>
          <p className="page-title">Halo, {user?.name} 👋</p>
          <p className="page-sub">{new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>

        <div className="stat-grid">
          {[
            { label: 'Mata Kuliah', value: courses.length, icon: '◻', bg: 'rgba(96,165,250,0.1)', color: '#60a5fa' },
            { label: 'Total Kehadiran', value: totalHadir + totalTerlambat, icon: '◈', bg: 'rgba(34,197,94,0.1)', color: '#22c55e' },
            { label: 'Rata-rata Kehadiran', value: `${avg}%`, icon: '▦', bg: 'rgba(99,102,241,0.12)', color: '#6366f1' },
          ].map(s => (
            <div key={s.label} className="stat-card">
              <div className="stat-icon" style={{ background: s.bg, color: s.color }}>{s.icon}</div>
              <div className="stat-label">{s.label}</div>
              <div className="stat-value">{s.value}</div>
            </div>
          ))}
        </div>

        {courseStats.length > 0 && (
          <div className="card" style={{ marginBottom: 20 }}>
            <div className="card-header">
              <span className="card-title">Kehadiran per Mata Kuliah</span>
            </div>
            <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              {courseStats.map(c => {
                const badge = getBadge(c.pct);
                return (
                  <div key={c.course}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-1)' }}>{c.course}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 12, color: 'var(--text-3)' }}>{c.hadir}/{c.total}</span>
                        <span className={`badge ${badge.cls}`}>{badge.label}</span>
                      </div>
                    </div>
                    <div className="progress-track">
                      <div className="progress-fill" style={{ width: `${c.pct}%`, background: getBarColor(c.pct) }} />
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>{c.pct}%</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="card">
          <div className="card-header"><span className="card-title">Absensi Terbaru</span></div>
          {loading ? <div className="empty-state">Memuat data...</div>
          : attendances.length === 0 ? <div className="empty-state">Belum ada data absensi</div>
          : (
            <div className="table-wrap">
              <table className="data-table">
                <thead><tr><th>Mata Kuliah</th><th>Jadwal</th><th>Waktu</th><th>Status</th></tr></thead>
                <tbody>
                  {attendances.slice(0, 8).map(a => (
                    <tr key={a.id}>
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
