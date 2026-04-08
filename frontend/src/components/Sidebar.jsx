import { useAuth } from '../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';

const adminMenus = [
  { label: 'Dashboard',   path: '/admin/dashboard',  icon: '▦' },
  { label: 'Mahasiswa',   path: '/admin/mahasiswa',   icon: '◑' },
  { label: 'Dosen',       path: '/admin/dosen',       icon: '◐' },
  { label: 'Mata Kuliah', path: '/admin/courses',     icon: '◻' },
  { label: 'Jadwal',      path: '/admin/schedules',   icon: '◷' },
  { label: 'Sesi Kelas',  path: '/dosen/attendance',  icon: '◉' },
  { label: 'Absensi',     path: '/admin/attendance',  icon: '◈' },
  { label: 'Users & Role',path: '/admin/users',       icon: '◎' },
];
const dosenMenus = [
  { label: 'Dashboard',   path: '/dosen/dashboard',   icon: '▦' },
  { label: 'Absensi',     path: '/dosen/attendance',  icon: '◈' },
];
const mahasiswaMenus = [
  { label: 'Dashboard',      path: '/mahasiswa/dashboard', icon: '▦' },
  { label: 'Riwayat Absensi',path: '/mahasiswa/attendance',icon: '◈' },
];

const S = {
  wrap: {
    width: 220, minHeight: '100vh', flexShrink: 0,
    background: '#1a1d24',
    borderRight: '1px solid #2a2f3a',
    display: 'flex', flexDirection: 'column',
  },
  logoWrap: { padding: '22px 20px 18px' },
  logoRow: { display: 'flex', alignItems: 'center', gap: 10 },
  logoIcon: {
    width: 32, height: 32, borderRadius: 8,
    background: 'rgba(99,102,241,0.2)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 14, color: '#6366f1',
  },
  logoName: { fontSize: 15, fontWeight: 600, color: '#f1f3f7', letterSpacing: '-0.01em' },
  logoSub:  { fontSize: 10, color: '#565d6e', marginTop: 1 },
  divider:  { height: 1, background: '#2a2f3a', margin: '0 20px 12px' },
  nav:      { flex: 1, padding: '4px 10px', display: 'flex', flexDirection: 'column', gap: 2 },
  sectionLabel: { fontSize: 10, fontWeight: 500, color: '#565d6e', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '10px 10px 4px' },
  item: (active) => ({
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '9px 10px', borderRadius: 8,
    fontSize: 13, fontWeight: active ? 500 : 400,
    color: active ? '#f1f3f7' : '#6b7280',
    background: active ? '#22262f' : 'transparent',
    border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left',
    transition: 'all 0.12s',
  }),
  itemDot: { width: 4, height: 4, borderRadius: '50%', background: '#6366f1', marginLeft: 'auto' },
  itemIcon: (active) => ({
    fontSize: 12, color: active ? '#6366f1' : '#565d6e', width: 16, textAlign: 'center', flexShrink: 0,
  }),
  bottom: { padding: '12px 10px 20px' },
  userCard: {
    background: '#22262f', borderRadius: 10, padding: '10px 12px',
    border: '1px solid #2a2f3a', marginBottom: 8,
  },
  userRow: { display: 'flex', alignItems: 'center', gap: 10 },
  userAvatar: {
    width: 30, height: 30, borderRadius: 7,
    background: 'rgba(99,102,241,0.2)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 12, fontWeight: 600, color: '#6366f1', flexShrink: 0,
  },
  userName: { fontSize: 13, fontWeight: 500, color: '#f1f3f7', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  userRole: { fontSize: 11, color: '#565d6e', marginTop: 1 },
  logoutBtn: {
    width: '100%', padding: '9px', borderRadius: 8,
    background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)',
    color: '#ef4444', fontSize: 13, fontWeight: 500, cursor: 'pointer',
    transition: 'background 0.12s',
  },
};

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const menus = user?.role === 'admin' ? adminMenus
    : user?.role === 'dosen' ? dosenMenus
    : mahasiswaMenus;

  const roleLabel = user?.role === 'admin' ? 'Administrator'
    : user?.role === 'dosen' ? 'Dosen' : 'Mahasiswa';

  const sections = user?.role === 'admin'
    ? [{ label: 'Menu', items: menus }]
    : [{ label: 'Menu', items: menus }];

  return (
    <div style={S.wrap}>
      <div style={S.logoWrap}>
        <div style={S.logoRow}>
          <div style={S.logoIcon}>◉</div>
          <div>
            <div style={S.logoName}>FaceAttend</div>
            <div style={S.logoSub}>Binus University</div>
          </div>
        </div>
      </div>
      <div style={S.divider} />
      <nav style={S.nav}>
        <div style={S.sectionLabel}>Menu</div>
        {menus.map((menu) => {
          const active = location.pathname === menu.path;
          return (
            <button
              key={menu.path}
              style={S.item(active)}
              onClick={() => navigate(menu.path)}
              onMouseEnter={e => { if (!active) { e.currentTarget.style.background = '#22262f'; e.currentTarget.style.color = '#c4c8d4'; } }}
              onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#6b7280'; } }}
            >
              <span style={S.itemIcon(active)}>{menu.icon}</span>
              <span>{menu.label}</span>
              {active && <span style={S.itemDot} />}
            </button>
          );
        })}
      </nav>
      <div style={S.bottom}>
        <div style={S.userCard}>
          <div style={S.userRow}>
            <div style={S.userAvatar}>{user?.name?.charAt(0).toUpperCase()}</div>
            <div style={{ minWidth: 0 }}>
              <div style={S.userName}>{user?.name}</div>
              <div style={S.userRole}>{roleLabel}</div>
            </div>
          </div>
        </div>
        <button
          style={S.logoutBtn}
          onClick={() => { logout(); navigate('/login'); }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.16)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(239,68,68,0.08)'}
        >
          Keluar
        </button>
      </div>
    </div>
  );
}
