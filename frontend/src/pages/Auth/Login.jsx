import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const res = await api.post('/api/auth/login', { email, password });
      login(res.data);
      if (res.data.role === 'admin') navigate('/admin/dashboard');
      else if (res.data.role === 'dosen') navigate('/dosen/dashboard');
      else navigate('/mahasiswa/dashboard');
    } catch (err) {
      setError(err.response?.data?.detail || 'Email atau password salah');
    } finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#111318', display: 'flex' }}>
      {/* Left panel */}
      <div style={{
        flex: 1, display: 'none', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', padding: '60px 48px',
        borderRight: '1px solid #2a2f3a', background: '#1a1d24',
      }} className="lg-flex">
        <style>{`.lg-flex { display: flex !important; } @media (max-width: 900px) { .lg-flex { display: none !important; } }`}</style>
        <div style={{ maxWidth: 340 }}>
          <div style={{
            width: 52, height: 52, borderRadius: 14,
            background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 22, marginBottom: 32,
          }}>◉</div>
          <h1 style={{ fontSize: 28, fontWeight: 600, color: '#f1f3f7', margin: '0 0 10px', letterSpacing: '-0.02em' }}>FaceAttend</h1>
          <p style={{ fontSize: 14, color: '#565d6e', lineHeight: 1.6, margin: '0 0 40px' }}>
            Sistem absensi berbasis face recognition untuk Binus University.
          </p>
          {[
            { icon: '◉', text: 'Absensi otomatis via wajah' },
            { icon: '▦', text: 'Dashboard real-time' },
            { icon: '◈', text: 'Laporan lengkap & akurat' },
          ].map((f, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '12px 16px', borderRadius: 10,
              background: '#22262f', border: '1px solid #2a2f3a',
              marginBottom: 10,
            }}>
              <span style={{ color: '#6366f1', fontSize: 14 }}>{f.icon}</span>
              <span style={{ fontSize: 13, color: '#9aa0b0' }}>{f.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right form */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>
        <div style={{ width: '100%', maxWidth: 380 }}>
          <div style={{ marginBottom: 36 }}>
            <h2 style={{ fontSize: 22, fontWeight: 600, color: '#f1f3f7', margin: '0 0 6px', letterSpacing: '-0.01em' }}>Masuk</h2>
            <p style={{ fontSize: 13, color: '#565d6e', margin: 0 }}>Gunakan akun institusi Anda</p>
          </div>

          {error && (
            <div className="alert alert-red">{error}</div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 16 }}>
              <label className="input-label">Email</label>
              <input
                type="email" className="input"
                value={email} onChange={e => setEmail(e.target.value)}
                placeholder="email@binus.ac.id" required
              />
            </div>
            <div style={{ marginBottom: 24 }}>
              <label className="input-label">Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPw ? 'text' : 'password'} className="input"
                  value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••" required
                  style={{ paddingRight: 40 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#565d6e', cursor: 'pointer', fontSize: 12, padding: 0 }}
                >
                  {showPw ? 'Semb.' : 'Lihat'}
                </button>
              </div>
            </div>
            <button type="submit" className="btn btn-primary" disabled={loading}
              style={{ width: '100%', justifyContent: 'center', padding: '11px', fontSize: 14 }}>
              {loading ? 'Memproses...' : 'Masuk'}
            </button>
          </form>

          <p style={{ textAlign: 'center', fontSize: 12, color: '#565d6e', marginTop: 32 }}>
            © 2026 Binus University · FaceAttend
          </p>
        </div>
      </div>
    </div>
  );
}
