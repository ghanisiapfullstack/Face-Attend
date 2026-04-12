import { useCallback, useEffect, useRef, useState } from 'react';
import Webcam from 'react-webcam';
import Sidebar from '../../components/Sidebar';
import api from '../../utils/api';
import AnimatedSection from '../../components/AnimatedSection';
import GlassCard from '../../components/GlassCard';
import { Camera, CalendarRange, Clock, Power, History, Edit3, Trash2, X, PlusCircle, UserCheck } from 'lucide-react';
import { clsx } from 'clsx';

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
  
  // Override Form states
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(null);
  const [editingOverrideId, setEditingOverrideId] = useState(null);
  const [overrideForm, setOverrideForm] = useState({
    original_date: '',
    replacement_date: '',
    new_start_time: '',
    new_end_time: '',
    new_room: '',
    reason: '',
  });

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
      return [{ ...entry, _key: key, time: new Date().toLocaleTimeString('id-ID', { hour:'2-digit', minute:'2-digit', second:'2-digit' }) }, ...prev];
    });
  }, [activeSessionId]);

  const startCamera = useCallback((sessionId) => {
    if (!sessionId) return;
    stopCamera();
    setIsCameraActive(true);
    setConnecting(true);
    setLiveStatus('Menghubungkan ke server AI...');

    const token = localStorage.getItem('token');
    const ws = new WebSocket(`ws://localhost:8000/api/face/ws?token=${encodeURIComponent(token || '')}&session_id=${sessionId}`);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnecting(false);
      setLiveStatus('Mendeteksi wajah biometrik...');
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
        setLiveStatus(data.message || 'Membaca fitur wajah...');
        return;
      }
      if (data.rejected && data.reason === 'not_enrolled') {
        setLiveStatus(`⚠ ${data.name}: ${data.message || 'Tidak terdaftar di MK ini'}`);
        return;
      }
      if (data.already_absent) {
        setLiveStatus(`⚠ ${data.name} sudah terekam di sesi ini`);
        return;
      }
      setLiveStatus(`✓ Autentikasi berhasil: ${data.name}`);
      addLog(data);
    };

    ws.onerror = () => {
      setLiveStatus('Koneksi WebSocket terputus. Silakan mulai ulang kamera.');
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

  const openOverrideModal = (schedule, override = null) => {
    setEditingSchedule(schedule);
    setEditingOverrideId(override?.id || null);
    setOverrideForm({
      original_date: override?.original_date || schedule.upcoming_regular_date || '',
      replacement_date: override?.replacement_date || '',
      new_start_time: override?.new_start_time || schedule.start_time,
      new_end_time: override?.new_end_time || schedule.end_time,
      new_room: override?.new_room || schedule.room,
      reason: override?.reason || '',
    });
    setShowOverrideModal(true);
  };

  const handleSaveOverride = async (e) => {
    e.preventDefault();
    if (!editingSchedule) return;
    try {
      if (editingOverrideId) {
        await api.put(`/api/schedules/overrides/${editingOverrideId}`, overrideForm);
      } else {
        await api.post(`/api/schedules/${editingSchedule.id}/overrides`, overrideForm);
      }
      setShowOverrideModal(false);
      setEditingSchedule(null);
      setEditingOverrideId(null);
      await refreshData();
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.detail || 'Gagal menyimpan kelas pengganti');
    }
  };

  const handleDeleteOverride = async (overrideId) => {
    if (!confirm('Hapus rintisan jadwal kelas pengganti ini secara permanen?')) return;
    try {
      await api.delete(`/api/schedules/overrides/${overrideId}`);
      await refreshData();
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.detail || 'Gagal menghapus jadwal pengganti');
    }
  };

  const statusColor = liveStatus.startsWith('✓')
    ? 'rgba(16, 185, 129, 0.9)'
    : liveStatus.startsWith('⚠')
      ? 'rgba(245, 158, 11, 0.9)'
      : 'rgba(0, 0, 0, 0.75)';

  return (
    <div className="layout">
      <Sidebar />
      <div className="main-content">
        <AnimatedSection delay={0.1}>
          <div className="mb-8">
            <h1 className="page-title">Sesi Absensi Kelas</h1>
            <p className="page-sub">Pilih jadwal, aktifkan sensor biometrik untuk memindai wajah mahasiswa</p>
          </div>
        </AnimatedSection>

        <AnimatedSection delay={0.2}>
          <GlassCard className="mb-6 p-5">
            <div className="flex flex-col md:flex-row gap-4 items-end justify-between">
              <div className="w-full md:w-[60%]">
                <label className="input-label">Pilih Jadwal Kelas Terdaftar</label>
                <select className="select-field" value={selectedSchedule} onChange={(e) => setSelectedSchedule(e.target.value)} disabled={activeSessionId !== null}>
                  <option value="">-- Silakan Pilih Jadwal Kelas --</option>
                  {schedules.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                </select>
              </div>
              <div className="flex gap-3 w-full md:w-auto">
                {!activeSessionId ? (
                  <button className="btn btn-accent w-full md:w-auto" disabled={!selectedSchedule} onClick={handleOpenSession}>
                    <Power size={16} /> Buka Sesi Absensi
                  </button>
                ) : (
                  <>
                    <button className={clsx("btn", isCameraActive ? "btn-ghost" : "btn-primary")} onClick={() => isCameraActive ? stopCamera() : startCamera(activeSessionId)}>
                      <Camera size={16} /> {isCameraActive ? 'Jeda Kamera' : 'Mulai Sensor AI'}
                    </button>
                    <button className="btn btn-danger-soft" onClick={handleCloseSession}>
                      <X size={16} /> Akhiri & Kunci Sesi
                    </button>
                  </>
                )}
              </div>
            </div>
          </GlassCard>
        </AnimatedSection>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
          {/* CAMERA SECTION */}
          <div className="lg:col-span-8">
            <AnimatedSection delay={0.3}>
              <GlassCard className="p-0 h-full overflow-hidden border-[var(--border)] ring-1 ring-[var(--border)] relative bg-[#050505]">
                {loading ? (
                  <div className="empty-state py-32">Menginisialisasi modul...</div>
                ) : !activeSessionId ? (
                  <div className="flex flex-col items-center justify-center py-32 px-6 text-center text-[var(--text-3)] bg-[var(--surface)]">
                    <div className="w-16 h-16 rounded-2xl bg-[var(--surface2)] flex items-center justify-center mb-4">
                      <Camera size={32} className="opacity-50" />
                    </div>
                    <p className="font-semibold text-[var(--text-1)] mb-1">Kamera Tidak Aktif</p>
                    <p className="text-sm">Buka sesi absensi terlebih dahulu pada form di atas.</p>
                  </div>
                ) : (
                  <div className="relative w-full aspect-video bg-black flex items-center justify-center">
                    {isCameraActive ? (
                      <>
                        <Webcam
                          ref={webcamRef}
                          screenshotFormat="image/jpeg"
                          screenshotQuality={0.85}
                          className="w-full object-cover aspect-video"
                          videoConstraints={{ facingMode: 'user' }}
                          mirrored
                        />
                        {/* Overlay HUD */}
                        <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md rounded-lg px-3 py-1.5 flex items-center gap-2 border border-white/10 z-10">
                          <div className="w-2 h-2 rounded-full overflow-hidden relative">
                             <div className="absolute inset-0 bg-[var(--green)] animate-ping opacity-75"></div>
                             <div className="absolute inset-0 bg-[var(--green)]"></div>
                          </div>
                          <span className="text-white text-xs font-bold tracking-wider">LIVE_FEED_ID:{activeSessionId}</span>
                        </div>
                        {liveStatus && (
                          <div 
                            className="absolute bottom-6 left-1/2 -translate-x-1/2 px-6 py-3 rounded-full text-white text-sm font-bold shadow-2xl backdrop-blur-md transition-all duration-300 z-10 flex items-center gap-2 border border-white/20 whitespace-nowrap"
                            style={{ background: statusColor }}
                          >
                            {liveStatus}
                          </div>
                        )}
                        {/* Scanning grid cosmetic */}
                        <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[linear-gradient(rgba(255,255,255,0)_0%,rgba(255,255,255,1)_50%,rgba(255,255,255,0)_100%)] bg-[length:100%_4px]" style={{ animation: 'scan 4s linear infinite' }}></div>
                        <style>{`@keyframes scan { 0% { background-position: 0 0 } 100% { background-position: 0 100% } }`}</style>
                      </>
                    ) : (
                      <div className="flex flex-col items-center text-[var(--text-3)]">
                        <Camera size={48} className="mb-4 opacity-20" />
                        <p className="text-sm font-medium">Sensor dijeda. Klik "Mulai Sensor AI" untuk melanjutkan.</p>
                      </div>
                    )}
                  </div>
                )}
              </GlassCard>
            </AnimatedSection>
          </div>

          {/* REALTIME LOG SECTION */}
          <div className="lg:col-span-4 max-h-[600px] flex flex-col">
            <AnimatedSection delay={0.4} className="h-full">
              <GlassCard className="p-0 h-full flex flex-col">
                <div className="card-header border-b border-[var(--border)] px-5 py-4 flex justify-between items-center bg-[var(--surface2)]">
                  <div className="flex items-center gap-2">
                    <UserCheck size={16} className="text-[var(--accent)]" />
                    <span className="font-bold text-[var(--text-1)] text-sm uppercase tracking-wide">Live Log</span>
                  </div>
                  <span className="badge bg-[var(--accent-bg)] text-[var(--accent)]">{log.length} Terekam</span>
                </div>
                
                <div className="flex-1 overflow-y-auto custom-scrollbar bg-[var(--surface)] p-2">
                  {log.length === 0 ? (
                    <div className="empty-state h-full flex flex-col justify-center">Belum ada wajah terdeteksi</div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {log.map((entry, i) => (
                        <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-[var(--surface2)] border border-[var(--border2)] hover:border-[var(--accent)] transition-colors animate-in fade-in slide-in-from-right-4 duration-300">
                          <div className="w-10 h-10 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-[var(--text-1)] flex items-center justify-center font-bold shadow-inner">
                            {entry.name?.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-bold text-[var(--text-1)] truncate leading-tight">{entry.name}</p>
                            <p className="text-[11px] font-medium text-[var(--text-3)] uppercase tracking-wider">{entry.nim}</p>
                          </div>
                          <div className="text-right shrink-0 flex flex-col items-end gap-1">
                            <span className={clsx("badge py-0.5 px-2 text-[10px]", entry.status === 'hadir' ? 'badge-green' : 'badge-amber')}>
                              {entry.status === 'hadir' ? 'Hadir' : 'Terlambat'}
                            </span>
                            <span className="text-[10px] font-bold text-[var(--text-3)] font-mono">{entry.time}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </GlassCard>
            </AnimatedSection>
          </div>
        </div>

        <AnimatedSection delay={0.5}>
          <GlassCard className="p-0 border-[var(--blue-bg)] mb-6">
            <div className="card-header border-b border-[var(--border)] px-6 py-4">
              <span className="card-title">Manajemen Rintisan Jadwal & Pengganti</span>
            </div>
            {loading ? (
              <div className="empty-state py-12">Memuat jadwal...</div>
            ) : schedules.length === 0 ? (
              <div className="empty-state py-12">Belum ada jadwal dialokasikan ke Anda</div>
            ) : (
              <div className="table-wrap custom-scrollbar rounded-none border-none">
                <table className="data-table">
                  <thead><tr><th>Mata Kuliah Reguler</th><th>Jadwal Utama</th><th>Status Perubahan Kelas</th><th className="text-right">Aksi</th></tr></thead>
                  <tbody>
                    {schedules.map((schedule) => (
                      <tr key={schedule.id}>
                        <td className="align-top">
                          <div className="font-bold text-[var(--text-1)] text-sm mb-1">{schedule.course_name}</div>
                          <div className="text-xs text-[var(--text-3)] uppercase font-semibold">Reguler</div>
                        </td>
                        <td className="align-top">
                          <div className="flex items-center gap-1.5 text-sm font-medium text-[var(--text-2)] mb-1">
                            {schedule.day} • {schedule.start_time.slice(0, 5)} - {schedule.end_time.slice(0, 5)}
                          </div>
                          <div className="text-xs text-[var(--text-3)]">R. {schedule.room}</div>
                        </td>
                        <td className="align-top">
                          {!schedule.overrides?.length ? (
                            <span className="text-[12px] font-medium text-[var(--text-3)]">Tidak ada penggantian</span>
                          ) : (
                            <div className="flex flex-col gap-3">
                              {schedule.overrides.map((override) => (
                                <div key={override.id} className="bg-[var(--surface2)] border border-[var(--border2)] rounded-xl p-3 relative">
                                  <div className="absolute top-3 right-3 flex gap-1">
                                    <button className="p-1.5 text-[var(--text-3)] hover:text-blue-500 rounded bg-[var(--surface)] transition-colors" onClick={() => openOverrideModal(schedule, override)}><Edit3 size={12} /></button>
                                    <button className="p-1.5 text-[var(--text-3)] hover:text-red-500 rounded bg-[var(--surface)] transition-colors" onClick={() => handleDeleteOverride(override.id)}><Trash2 size={12} /></button>
                                  </div>
                                  <div className="badge badge-amber mb-2 w-max text-[10px]">Dialihkan</div>
                                  <div className="text-xs font-medium text-[var(--text-1)] leading-relaxed">
                                    Tanggal: {new Date(override.replacement_date).toLocaleDateString('id-ID', { weekday: 'long', day:'numeric', month:'long' })}<br/>
                                    Jam: {override.new_start_time.slice(0, 5)} - {override.new_end_time.slice(0, 5)}<br/>
                                    Ruang: {override.new_room || schedule.room}
                                  </div>
                                  {override.reason && <div className="mt-2 text-[11px] text-[var(--text-3)] italic">Ket: {override.reason}</div>}
                                </div>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="align-top text-right">
                          <button className="btn btn-ghost btn-sm border-[var(--border)]" onClick={() => openOverrideModal(schedule)}>
                            <PlusCircle size={14} /> Atur Pengganti
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </GlassCard>
        </AnimatedSection>

        {showOverrideModal && editingSchedule && (
          <div className="modal-backdrop bg-black/80 backdrop-blur-sm" onClick={(e) => e.target === e.currentTarget && setShowOverrideModal(false)}>
            <AnimatedSection className="w-full max-w-[500px]">
              <GlassCard className="p-8 border border-[var(--border2)]">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold text-[var(--text-1)]">{editingOverrideId ? 'Edit Perubahan Jadwal' : 'Buat Kelas Pengganti'}</h2>
                  <button onClick={() => setShowOverrideModal(false)} className="text-[var(--text-3)] hover:text-[var(--text-1)] transition-colors"><X size={20} /></button>
                </div>

                <form onSubmit={handleSaveOverride} className="space-y-5">
                  <div className="bg-[var(--surface2)] p-4 rounded-xl border border-[var(--border)] mb-2">
                    <p className="text-xs text-[var(--text-3)] uppercase font-bold tracking-wider mb-1">Mata Kuliah Target</p>
                    <p className="text-sm font-semibold text-[var(--text-1)]">{editingSchedule.course_name}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="input-label">Tgl. Asal (Ditiadakan)</label>
                      <input type="date" className="input bg-[var(--bg)]" value={overrideForm.original_date} onChange={(e) => setOverrideForm({ ...overrideForm, original_date: e.target.value })} required />
                    </div>
                    <div>
                      <label className="input-label">Tgl. Baru (Pengganti)</label>
                      <input type="date" className="input border-[var(--accent)] bg-[var(--accent-bg)] shadow-[0_0_0_1px_var(--accent)]" value={overrideForm.replacement_date} onChange={(e) => setOverrideForm({ ...overrideForm, replacement_date: e.target.value })} required />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="input-label">Jam Mulai Baru</label>
                      <input type="time" className="input bg-[var(--bg)]" value={overrideForm.new_start_time} onChange={(e) => setOverrideForm({ ...overrideForm, new_start_time: e.target.value })} required />
                    </div>
                    <div>
                      <label className="input-label">Jam Selesai Baru</label>
                      <input type="time" className="input bg-[var(--bg)]" value={overrideForm.new_end_time} onChange={(e) => setOverrideForm({ ...overrideForm, new_end_time: e.target.value })} required />
                    </div>
                  </div>

                  <div>
                    <label className="input-label">Ruangan Baru</label>
                    <input type="text" className="input bg-[var(--bg)]" value={overrideForm.new_room} onChange={(e) => setOverrideForm({ ...overrideForm, new_room: e.target.value })} required />
                  </div>
                  
                  <div>
                    <label className="input-label">Alasan Pemindahan (Opsional)</label>
                    <textarea className="input bg-[var(--bg)] resize-none" value={overrideForm.reason} onChange={(e) => setOverrideForm({ ...overrideForm, reason: e.target.value })} rows={2} placeholder="Misal: Dosen berhalangan dinas..." />
                  </div>
                  
                  <div className="flex gap-3 pt-4">
                    <button type="submit" className="btn btn-accent flex-1 justify-center py-3">
                      {editingOverrideId ? 'Update Jadwal' : 'Simpan & Publikasikan'}
                    </button>
                    <button type="button" className="btn btn-ghost border-[var(--border)] px-6" onClick={() => setShowOverrideModal(false)}>
                      Batal
                    </button>
                  </div>
                </form>
              </GlassCard>
            </AnimatedSection>
          </div>
        )}
      </div>
    </div>
  );
}
