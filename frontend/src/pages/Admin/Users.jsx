import { useEffect, useState } from 'react';
import Sidebar from '../../components/Sidebar';
import api from '../../utils/api';

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState('');

  const fetchUsers = async () => {
    try { const r = await api.get('/api/users/all'); setUsers(r.data); }
    catch (e) { console.error(e); } finally { setLoading(false); }
  };
  useEffect(() => { fetchUsers(); }, []);

  const handleRoleChange = async (userId, newRole) => {
    try {
      await api.put(`/api/users/role/${userId}`, { role: newRole });
      setSuccess('Role berhasil diupdate!');
      fetchUsers(); setTimeout(() => setSuccess(''), 3000);
    } catch (e) { console.error(e); }
  };

  const roleBadge = (role) => role === 'admin' ? 'badge-purple' : role === 'dosen' ? 'badge-blue' : 'badge-green';

  return (
    <div className="layout">
      <Sidebar />
      <div className="main-content">
        <div style={{ marginBottom: 28 }}>
          <p className="page-title">Users & Role</p>
          <p className="page-sub">Kelola role semua pengguna sistem</p>
        </div>

        {success && <div className="alert alert-green">{success}</div>}

        <div className="card">
          {loading ? <div className="empty-state">Memuat data...</div>
          : users.length === 0 ? <div className="empty-state">Belum ada data user</div>
          : (
            <div className="table-wrap">
              <table className="data-table">
                <thead><tr><th>#</th><th>Nama</th><th>Email</th><th>Role</th><th>Ubah Role</th></tr></thead>
                <tbody>
                  {users.map((u, i) => (
                    <tr key={u.id}>
                      <td style={{ color: 'var(--text-3)' }}>{i + 1}</td>
                      <td style={{ fontWeight: 500, color: 'var(--text-1)' }}>{u.name}</td>
                      <td style={{ fontSize: 12 }}>{u.email}</td>
                      <td><span className={`badge ${roleBadge(u.role)}`}>{u.role}</span></td>
                      <td>
                        <select
                          value={u.role}
                          onChange={e => handleRoleChange(u.id, e.target.value)}
                          className="select-field"
                          style={{ width: 'auto', padding: '6px 10px', fontSize: 12 }}
                        >
                          <option value="admin">Admin</option>
                          <option value="dosen">Dosen</option>
                          <option value="mahasiswa">Mahasiswa</option>
                        </select>
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
