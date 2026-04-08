import { useCallback, useEffect, useRef, useState } from 'react';
import Webcam from 'react-webcam';
import Sidebar from '../../components/Sidebar';
import api from '../../utils/api';

export default function DosenAttendance() {
  const webcamRef = useRef(null);
  const wsRef = useRef(null);
  const intervalRef = useRef(null);

  const [schedules, setSchedules] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [selectedSchedule, setSelectedSchedule] = useState('');
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [connecting, setConnecting] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [log, setLog] = useState([]);
  const [liveStatus, setLiveStatus] = useState('');
  const [loading, setLoading] = useState(true);

  const refreshData = useCallback(async () => {
    try {
      const [scheduleRes, sessionRes] = await Promise.all([
        api.get('/api/schedules/my'),
        api.get('/api/attendance/sessions'),
      ]);
      setSchedules(scheduleRes.data || []);
      setSessions(sessionRes.data || []);
      const openSession = (sessionRes.data || []).find((s) => s.status === 'open');
      if (openSession) setActiveSessionId(openSession.id);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  const stopCamera = useCallback(() => {
    setIsCameraActive(false);
    setConnecting(false);
    setLiveStatus('');
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  const addLog = useCallback((entry) => {
    setLog((prev) => {
      const key = `${entry.nim}_${activeSessionId}`;
      if (prev.find((p) => p._key === key)) return prev;
      return [{ ...entry, _key: key, time: new Date().toLocaleTimeString('id-ID') }, ...prev];
    });
  }, [activeSessionId]);

  const startCamera = useCallback((sessionId) => {
    if (!sessionId) return;
    stopCamera();
    setIsCameraActive(true);
    setConnecting(true);
    setLiveStatus('Menghubungkan ke server...');

    const token = localStorage.getItem('token');
    const ws = new WebSocket(`ws://localhost:8000/api/face/ws?token=${encodeURIComponent(token || '')}&session_id=${sessionId}`);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnecting(false);
      setLiveStatus('Mendeteksi wajah...');
      intervalRef.current = setInterval(() => {
        if (webcamRef.current && ws.readyState === WebSocket.OPEN) {
          const img = webcamRef.current.getScreenshot();
          if (img) ws.send(JSON.stringify({ image: img }));
        }
      }, 450);
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.error) {
        setLiveStatus(`Error: ${data.error}`);
        stopCamera();
        return;
      }
      if (!data.recognized) {
        setLiveStatus('Mendeteksi wajah...');
        return;
      }
      if (data.already_absent) {
        setLiveStatus(`⚠ ${data.name} sudah absen di sesi ini`);
        return;
      }
      setLiveStatus(`✓ ${data.name} berhasil absen`);
      addLog(data);
    };

    ws.onerror = () => {
      setLiveStatus('Koneksi gagal. Coba lagi.');
      stopCamera();
    };
  }, [addLog, stopCamera]);

  useEffect(() => () => stopCamera(), [stopCamera]);

  const handleOpenSession = async () => {
    if (!selectedSchedule) return;
    try {
      const r = await api.post('/api/attendance/sessions/open', { schedule_id: Number(selectedSchedule) });
      const sessionId = r.data?.session_id;
      if (sessionId) {
        setActiveSessionId(sessionId);
        setLog([]);
        await refreshData();
        startCamera(sessionId);
      }
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.detail || 'Gagal membuka sesi');
    }
  };

  const handleCloseSession = async () => {
    if (!activeSessionId) return;
    try {
      await api.post(`/api/attendance/sessions/${activeSessionId}/close`);
      stopCamera();
      setActiveSessionId(null);
      await refreshData();
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.detail || 'Gagal menutup sesi');
    }
  };

  const statusColor = liveStatus.startsWith('✓')
    ? 'rgba(34,197,94,0.88)'
    : liveStatus.startsWith('⚠')
      ? 'rgba(245,158,11,0.85)'
      : 'rgba(0,0,0,0.6)';

  return (
    <div className="layout">
      <Sidebar />
      <div className="main-content">
        <div style={{ marginBottom: 28 }}>
          <p className="page-title">Sesi Absensi Kelas</p>
          <p className="page-sub">Buka sesi, scan mahasiswa bergantian, lalu tutup sesi untuk lock absensi</p>
        </div>

        <div className="filter-bar" style={{ marginBottom: 18 }}>
          <div>
            <label className="input-label">Pilih Jadwal</label>
            <select className="select-field" value={selectedSchedule} onChange={(e) => setSelectedSchedule(e.target.value)}>
              <option value="">Pilih jadwal kelas</option>
              {schedules.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </div>
          <div style={{ marginLeft: 'auto', alignSelf: 'flex-end', display: 'flex', gap: 8 }}>
            {!activeSessionId ? (
              <button className="btn btn-primary" disabled={!selectedSchedule} onClick={handleOpenSession}>
                Buka Sesi
              </button>
            ) : (
              <>
                <button className="btn btn-ghost" onClick={() => startCamera(activeSessionId)}>
                  Aktifkan Kamera
                </button>
                <button className="btn btn-danger-soft" onClick={handleCloseSession}>
                  Tutup Sesi
                </button>
              </>
            )}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20, alignItems: 'start' }}>
          <div className="card">
            <div style={{ padding: 16 }}>
              {loading ? (
                <div className="empty-state">Memuat data sesi...</div>
              ) : !activeSessionId ? (
                <div className="empty-state">Belum ada sesi aktif. Pilih jadwal lalu klik "Buka Sesi".</div>
              ) : (
                <div style={{ borderRadius: 9, overflow: 'hidden', position: 'relative', background: '#090c12', border: '1px solid var(--border)' }}>
                  {isCameraActive ? (
                    <>
                      <Webcam
                        ref={webcamRef}
                        screenshotFormat="image/jpeg"
                        screenshotQuality={0.85}
                        style={{ width: '100%', display: 'block' }}
                        videoConstraints={{ facingMode: 'user', width: 1280, height: 720 }}
                        mirrored
                      />
                      <div style={{ position: 'absolute', top: 10, left: 10, background: 'rgba(0,0,0,0.65)', borderRadius: 7, padding: '4px 10px', color: '#fff', fontSize: 11 }}>
                        {connecting ? 'Menghubungkan...' : `Sesi #${activeSessionId} aktif`}
                      </div>
                      {liveStatus && (
                        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '10px 16px', textAlign: 'center', fontSize: 13, fontWeight: 500, color: '#fff', background: statusColor }}>
                          {liveStatus}
                        </div>
                      )}
                    </>
                  ) : (
                    <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-3)' }}>
                      Kamera belum aktif. Klik "Aktifkan Kamera".
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="card" style={{ position: 'sticky', top: 20 }}>
            <div className="card-header">
              <span className="card-title">Log Sesi Aktif</span>
              <span style={{ fontSize: 12, color: 'var(--text-3)' }}>{log.length} orang</span>
            </div>
            {log.length === 0 ? (
              <div className="empty-state">Belum ada absensi masuk</div>
            ) : (
              <div style={{ maxHeight: 360, overflowY: 'auto' }}>
                {log.map((entry, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--accent-bg)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600 }}>
                      {entry.name?.charAt(0).toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-1)', margin: 0 }}>{entry.name}</p>
                      <p style={{ fontSize: 11, color: 'var(--text-3)', margin: 0 }}>{entry.nim}</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span className={`badge ${entry.status === 'hadir' ? 'badge-green' : 'badge-amber'}`}>
                        {entry.status === 'hadir' ? 'Hadir' : 'Terlambat'}
                      </span>
                      <p style={{ fontSize: 10, color: 'var(--text-3)', margin: '3px 0 0' }}>{entry.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="card" style={{ marginTop: 20 }}>
          <div className="card-header">
            <span className="card-title">Riwayat Sesi</span>
          </div>
          {sessions.length === 0 ? (
            <div className="empty-state">Belum ada sesi dibuat</div>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead><tr><th>#</th><th>Mata Kuliah</th><th>Jadwal</th><th>Mulai</th><th>Selesai</th><th>Status</th><th>Jumlah Absen</th></tr></thead>
                <tbody>
                  {sessions.map((s, i) => (
                    <tr key={s.id}>
                      <td style={{ color: 'var(--text-3)' }}>{i + 1}</td>
                      <td>{s.course_name || '—'}</td>
                      <td style={{ fontSize: 12 }}>{s.schedule_label || '—'}</td>
                      <td style={{ fontSize: 12 }}>{new Date(s.started_at).toLocaleString('id-ID')}</td>
                      <td style={{ fontSize: 12 }}>{s.ended_at ? new Date(s.ended_at).toLocaleString('id-ID') : '—'}</td>
                      <td><span className={`badge ${s.status === 'open' ? 'badge-green' : 'badge-amber'}`}>{s.status}</span></td>
                      <td>{s.attendance_count}</td>
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
