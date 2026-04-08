import { useRef, useState, useEffect, useCallback } from 'react';
import Webcam from 'react-webcam';
import Sidebar from '../../components/Sidebar';

export default function MahasiswaAbsensi() {
  const webcamRef   = useRef(null);
  const wsRef       = useRef(null);
  const intervalRef = useRef(null);

  const [isActive,    setIsActive]    = useState(false);
  const [connecting,  setConnecting]  = useState(false);
  const [log,         setLog]         = useState([]); // riwayat absensi selama sesi ini
  const [liveStatus,  setLiveStatus]  = useState(''); // pesan live di bawah kamera

  // Tambah entri ke log sesi (dedup by nim + tanggal)
  const addLog = useCallback((data) => {
    setLog(prev => {
      const key = data.nim + '_' + new Date().toDateString();
      if (prev.find(e => e._key === key)) return prev; // sudah ada, skip
      return [{ ...data, _key: key, time: new Date().toLocaleTimeString('id-ID') }, ...prev];
    });
  }, []);

  const stopAbsensi = useCallback(() => {
    setIsActive(false);
    setConnecting(false);
    setLiveStatus('');
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (wsRef.current) { wsRef.current.close(); wsRef.current = null; }
  }, []);

  const startAbsensi = () => {
    setIsActive(true);
    setConnecting(true);
    setLiveStatus('Menghubungkan ke server...');

    const ws = new WebSocket('ws://localhost:8000/api/face/ws');
    wsRef.current = ws;

    ws.onopen = () => {
      setConnecting(false);
      setLiveStatus('Mendeteksi wajah...');
      // 400ms = lebih responsif
      intervalRef.current = setInterval(() => {
        if (webcamRef.current && ws.readyState === WebSocket.OPEN) {
          const img = webcamRef.current.getScreenshot();
          if (img) ws.send(JSON.stringify({ image: img }));
        }
      }, 400);
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (!data.recognized) {
        setLiveStatus('Mendeteksi wajah...');
        return;
      }

      if (data.already_absent) {
        // Sudah absen — tampilkan sebentar lalu lanjut scanning
        setLiveStatus(`⚠ ${data.name} sudah absen hari ini`);
        setTimeout(() => {
          if (wsRef.current) setLiveStatus('Mendeteksi wajah...');
        }, 2000);
        return;
      }

      // Berhasil absen — catat ke log, lanjut scanning (JANGAN stop otomatis)
      setLiveStatus(`✓ ${data.name} berhasil absen`);
      addLog(data);
      setTimeout(() => {
        if (wsRef.current) setLiveStatus('Mendeteksi wajah...');
      }, 2500);
    };

    ws.onerror = () => {
      setLiveStatus('Koneksi gagal. Coba lagi.');
      stopAbsensi();
    };
  };

  useEffect(() => () => stopAbsensi(), [stopAbsensi]);

  const statusColor = liveStatus.startsWith('✓')
    ? 'rgba(34,197,94,0.88)'
    : liveStatus.startsWith('⚠')
    ? 'rgba(245,158,11,0.85)'
    : 'rgba(0,0,0,0.6)';

  return (
    <div className="layout">
      <Sidebar />
      <div className="main-content">
        <div style={{ marginBottom: 24 }}>
          <p className="page-title">Absensi Sesi Kelas</p>
          <p className="page-sub">
            Kamera tetap aktif — mahasiswa bisa scan bergantian tanpa perlu login ulang
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20, alignItems: 'start' }}>

          {/* ── Kiri: Kamera ── */}
          <div className="card">
            <div style={{ padding: 18 }}>

              {/* Viewport */}
              <div style={{
                borderRadius: 9, overflow: 'hidden', position: 'relative',
                background: '#090c12', border: '1px solid var(--border)',
              }}>
                {isActive ? (
                  <div style={{ position: 'relative' }}>
                    <Webcam
                      ref={webcamRef}
                      screenshotFormat="image/jpeg"
                      screenshotQuality={0.85}
                      style={{ width: '100%', display: 'block' }}
                      videoConstraints={{ facingMode: 'user', width: 1280, height: 720 }}
                      mirrored
                    />

                    {/* Status chip kiri atas */}
                    <div style={{
                      position: 'absolute', top: 10, left: 10,
                      background: 'rgba(0,0,0,0.65)', borderRadius: 7,
                      padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 6,
                    }}>
                      <span style={{
                        width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
                        background: connecting ? 'var(--amber)' : 'var(--green)',
                        animation: 'pulse 1.5s infinite',
                      }} />
                      <span style={{ fontSize: 11, color: '#fff', fontWeight: 500 }}>
                        {connecting ? 'Menghubungkan...' : 'Kamera Aktif'}
                      </span>
                    </div>

                    {/* Jumlah terdeteksi chip kanan atas */}
                    <div style={{
                      position: 'absolute', top: 10, right: 10,
                      background: 'rgba(99,102,241,0.8)', borderRadius: 7,
                      padding: '4px 10px', fontSize: 11, color: '#fff', fontWeight: 500,
                    }}>
                      {log.length} absen
                    </div>

                    {/* Status bar bawah */}
                    {liveStatus && (
                      <div style={{
                        position: 'absolute', bottom: 0, left: 0, right: 0,
                        padding: '10px 16px', textAlign: 'center',
                        fontSize: 13, fontWeight: 500, color: '#fff',
                        background: statusColor,
                        transition: 'background 0.3s',
                      }}>
                        {liveStatus}
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{
                    height: 300, display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center', gap: 10,
                  }}>
                    <div style={{ fontSize: 44, opacity: 0.15 }}>◉</div>
                    <p style={{ fontSize: 13, color: 'var(--text-3)', margin: 0 }}>Kamera belum aktif</p>
                    <p style={{ fontSize: 12, color: 'var(--text-3)', margin: 0, textAlign: 'center', maxWidth: 280 }}>
                      Klik Mulai Sesi — mahasiswa bisa scan bergantian
                    </p>
                  </div>
                )}
              </div>

              {/* Button */}
              <div style={{ marginTop: 14 }}>
                {!isActive ? (
                  <button
                    className="btn btn-primary"
                    onClick={startAbsensi}
                    style={{ width: '100%', justifyContent: 'center', padding: 12, fontSize: 14 }}
                  >
                    Mulai Sesi Absensi
                  </button>
                ) : (
                  <button
                    className="btn"
                    onClick={stopAbsensi}
                    style={{
                      width: '100%', justifyContent: 'center', padding: 12, fontSize: 14,
                      background: 'var(--red-bg)', color: 'var(--red)',
                      border: '1px solid rgba(239,68,68,0.2)',
                    }}
                  >
                    Akhiri Sesi
                  </button>
                )}
              </div>

              {/* Tips */}
              <div style={{
                marginTop: 14, padding: '12px 14px',
                background: 'var(--bg)', border: '1px solid var(--border)',
                borderRadius: 8,
              }}>
                <p style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 8px' }}>Tips</p>
                {[
                  'Kamera tidak berhenti otomatis — mahasiswa scan bergantian',
                  'Jarak ideal 40–60 cm, cahaya cukup',
                  'Wajah yang sudah absen tidak akan tercatat dua kali',
                ].map((t, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 5 }}>
                    <span style={{ color: 'var(--accent)', fontSize: 10, marginTop: 2, flexShrink: 0 }}>▸</span>
                    <p style={{ fontSize: 12, color: 'var(--text-2)', margin: 0 }}>{t}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Kanan: Log sesi ── */}
          <div className="card" style={{ position: 'sticky', top: 20 }}>
            <div className="card-header">
              <span className="card-title">Log Sesi Ini</span>
              <span style={{ fontSize: 12, color: 'var(--text-3)' }}>{log.length} orang</span>
            </div>

            {log.length === 0 ? (
              <div style={{ padding: '32px 20px', textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>
                Belum ada yang absen
              </div>
            ) : (
              <div style={{ maxHeight: 400, overflowY: 'auto' }}>
                {log.map((entry, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '10px 16px',
                    borderBottom: '1px solid var(--border)',
                  }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                      background: 'var(--accent-bg)', color: 'var(--accent)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 12, fontWeight: 600,
                    }}>
                      {entry.name?.charAt(0).toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-1)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{entry.name}</p>
                      <p style={{ fontSize: 11, color: 'var(--text-3)', margin: 0 }}>{entry.nim}</p>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <span className={`badge ${entry.status === 'hadir' ? 'badge-green' : 'badge-amber'}`}>
                        {entry.status === 'hadir' ? 'Hadir' : 'Terlambat'}
                      </span>
                      <p style={{ fontSize: 10, color: 'var(--text-3)', margin: '3px 0 0', textAlign: 'right' }}>{entry.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {log.length > 0 && (
              <div style={{ padding: '10px 16px', borderTop: '1px solid var(--border)' }}>
                <button
                  className="btn btn-ghost btn-sm"
                  style={{ width: '100%', justifyContent: 'center' }}
                  onClick={() => setLog([])}
                >
                  Bersihkan Log
                </button>
              </div>
            )}
          </div>

        </div>

        <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }`}</style>
      </div>
    </div>
  );
}
