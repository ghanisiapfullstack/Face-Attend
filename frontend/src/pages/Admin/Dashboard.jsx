import { useEffect, useState } from 'react';
import Sidebar from '../../components/Sidebar';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';

function StatCard({ label, value, icon, color }) {
  const colors = {
    indigo: { bg: 'rgba(99,102,241,0.12)', color: '#6366f1' },
    green:  { bg: 'rgba(34,197,94,0.1)',   color: '#22c55e' },
    amber:  { bg: 'rgba(245,158,11,0.1)',  color: '#f59e0b' },
    blue:   { bg: 'rgba(96,165,250,0.1)',  color: '#60a5fa' },
  };
  const c = colors[color] || colors.indigo;
  return (
    <div className="stat-card">
      <div className="stat-icon" style={{ background: c.bg, color: c.color }}>{icon}</div>
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
    </div>
  );
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ total_students: 0, total_lecturers: 0, total_courses: 0, today_attendance: 0 });
  const [attendances, setAttendances] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.get('/api/attendance/stats'), api.get('/api/attendance/all')])
      .then(([s, a]) => { setStats(s.data); setAttendances(a.data.slice(0, 10)); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="layout">
      <Sidebar />
      <div className="main-content">
        <div style={{ marginBottom: 28 }}>
          <p className="page-title">Dashboard</p>
          <p className="page-sub">{new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>

        <div className="stat-grid">
          <StatCard label="Total Mahasiswa"   value={stats.total_students}   icon="◑" color="indigo" />
          <StatCard label="Total Dosen"        value={stats.total_lecturers}  icon="◐" color="blue" />
          <StatCard label="Mata Kuliah"        value={stats.total_courses}    icon="◻" color="amber" />
          <StatCard label="Hadir Hari Ini"     value={stats.today_attendance} icon="◈" color="green" />
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-title">Absensi Terbaru</span>
            <span style={{ fontSize: 12, color: 'var(--text-3)' }}>{attendances.length} entri</span>
          </div>
          {loading ? (
            <div className="empty-state">Memuat data...</div>
          ) : attendances.length === 0 ? (
            <div className="empty-state">Belum ada data absensi</div>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>NIM</th><th>Nama</th><th>Mata Kuliah</th><th>Waktu</th><th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {attendances.map((a) => (
                    <tr key={a.id}>
                      <td style={{ color: 'var(--text-1)', fontWeight: 500 }}>{a.student_nim}</td>
                      <td>{a.student_name}</td>
                      <td>{a.course_name || '—'}</td>
                      <td style={{ fontSize: 12 }}>{new Date(a.check_in_time).toLocaleString('id-ID')}</td>
                      <td>
                        <span className={`badge ${a.status === 'hadir' ? 'badge-green' : 'badge-amber'}`}>
                          {a.status === 'hadir' ? 'Hadir' : 'Terlambat'}
                        </span>
                      </td>
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
