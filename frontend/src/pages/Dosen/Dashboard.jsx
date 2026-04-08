import { useEffect, useState } from 'react';
import Sidebar from '../../components/Sidebar';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';

export default function DosenDashboard() {
  const { user } = useAuth();
  const [attendances, setAttendances] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.get('/api/attendance/dosen'), api.get('/api/schedules/my')])
      .then(([attendanceRes, scheduleRes]) => {
        setAttendances(attendanceRes.data || []);
        setSchedules(scheduleRes.data || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const totalHadir = attendances.filter(a => a.status === 'hadir').length;
  const totalTerlambat = attendances.filter(a => a.status === 'terlambat').length;
  const courses = [...new Set(schedules.map(s => s.course_name).filter(Boolean))];

  return (
    <div className="layout">
      <Sidebar />
      <div className="main-content">
        <div style={{ marginBottom: 28 }}>
          <p className="page-title">Selamat datang, {user?.name}</p>
          <p className="page-sub">{new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>

        <div className="stat-grid">
          {[
            { label: 'Mata Kuliah', value: courses.length, icon: '◻', color: { bg: 'rgba(96,165,250,0.1)', color: '#60a5fa' } },
            { label: 'Total Hadir', value: totalHadir, icon: '◈', color: { bg: 'rgba(34,197,94,0.1)', color: '#22c55e' } },
            { label: 'Total Terlambat', value: totalTerlambat, icon: '◷', color: { bg: 'rgba(245,158,11,0.1)', color: '#f59e0b' } },
          ].map(s => (
            <div key={s.label} className="stat-card">
              <div className="stat-icon" style={s.color}>{s.icon}</div>
              <div className="stat-label">{s.label}</div>
              <div className="stat-value">{s.value}</div>
            </div>
          ))}
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-title">Absensi Terbaru</span>
          </div>
          {loading ? <div className="empty-state">Memuat data...</div>
          : attendances.length === 0 ? <div className="empty-state">Belum ada data absensi</div>
          : (
            <div className="table-wrap">
              <table className="data-table">
                <thead><tr><th>NIM</th><th>Nama</th><th>Mata Kuliah</th><th>Waktu</th><th>Status</th></tr></thead>
                <tbody>
                  {attendances.slice(0, 10).map(a => (
                    <tr key={a.id}>
                      <td style={{ fontWeight: 500, color: 'var(--text-1)' }}>{a.student_nim}</td>
                      <td>{a.student_name}</td>
                      <td>{a.course_name || '—'}</td>
                      <td style={{ fontSize: 12 }}>{new Date(a.check_in_time).toLocaleString('id-ID')}</td>
                      <td><span className={`badge ${a.status === 'hadir' ? 'badge-green' : 'badge-amber'}`}>{a.status === 'hadir' ? 'Hadir' : 'Terlambat'}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="card" style={{ marginTop: 20 }}>
          <div className="card-header">
            <span className="card-title">Jadwal Kelas Anda</span>
          </div>
          {loading ? <div className="empty-state">Memuat data...</div>
          : schedules.length === 0 ? <div className="empty-state">Belum ada jadwal terhubung ke akun dosen ini</div>
          : (
            <div className="table-wrap">
              <table className="data-table">
                <thead><tr><th>Mata Kuliah</th><th>Hari</th><th>Jam</th><th>Ruangan</th></tr></thead>
                <tbody>
                  {schedules.slice(0, 8).map(s => (
                    <tr key={s.id}>
                      <td style={{ fontWeight: 500, color: 'var(--text-1)' }}>{s.course_name || '—'}</td>
                      <td>{s.day}</td>
                      <td style={{ fontSize: 12 }}>{s.start_time} - {s.end_time}</td>
                      <td>{s.room}</td>
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
