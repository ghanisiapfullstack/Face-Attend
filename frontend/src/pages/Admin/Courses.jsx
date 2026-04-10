import { useEffect, useState } from 'react';
import Sidebar from '../../components/Sidebar';
import api from '../../utils/api';

export default function AdminCourses() {
  const [courses, setCourses] = useState([]);
  const [lecturers, setLecturers] = useState([]);
  const [students, setStudents] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [enrolledStudents, setEnrolledStudents] = useState([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showEnrollmentModal, setShowEnrollmentModal] = useState(false);
  const [form, setForm] = useState({ code: '', name: '', lecturer_id: '', credits: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchData = async () => {
    try {
      const [cr, lr, sr] = await Promise.all([api.get('/api/courses'), api.get('/api/users/lecturers'), api.get('/api/users/students')]);
      setCourses(cr.data); setLecturers(lr.data); setStudents(sr.data);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };
  useEffect(() => { fetchData(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault(); setError('');
    try {
      await api.post('/api/courses', form);
      setSuccess('Mata kuliah berhasil ditambahkan!');
      setShowModal(false); setForm({ code: '', name: '', lecturer_id: '', credits: '' }); fetchData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (e) { setError(e.response?.data?.detail || 'Gagal menambahkan mata kuliah'); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Yakin hapus mata kuliah ini?')) return;
    try { await api.delete(`/api/courses/${id}`); fetchData(); } catch (e) { console.error(e); }
  };

  const openEnrollmentModal = async (course) => {
    setSelectedCourse(course);
    setSelectedStudentIds([]);
    setShowEnrollmentModal(true);
    try {
      const res = await api.get(`/api/courses/${course.id}/students`);
      setEnrolledStudents(res.data || []);
    } catch (e) {
      console.error(e);
      setEnrolledStudents([]);
    }
  };

  const handleAssignStudents = async () => {
    if (!selectedCourse || selectedStudentIds.length === 0) return;
    try {
      await api.post(`/api/courses/${selectedCourse.id}/enrollments`, { student_ids: selectedStudentIds });
      const res = await api.get(`/api/courses/${selectedCourse.id}/students`);
      setEnrolledStudents(res.data || []);
      setSelectedStudentIds([]);
      fetchData();
      setSuccess('Mahasiswa berhasil diassign ke mata kuliah.');
      setTimeout(() => setSuccess(''), 3000);
    } catch (e) {
      setError(e.response?.data?.detail || 'Gagal assign mahasiswa');
    }
  };

  const handleRemoveEnrollment = async (studentId) => {
    if (!selectedCourse) return;
    if (!confirm('Keluarkan mahasiswa ini dari mata kuliah?')) return;
    try {
      await api.delete(`/api/courses/${selectedCourse.id}/enrollments/${studentId}`);
      const res = await api.get(`/api/courses/${selectedCourse.id}/students`);
      setEnrolledStudents(res.data || []);
      fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  const enrolledIds = new Set(enrolledStudents.map((s) => s.student_id));
  const availableStudents = students.filter((s) => !enrolledIds.has(s.id));

  return (
    <div className="layout">
      <Sidebar />
      <div className="main-content">
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
          <div>
            <p className="page-title">Mata Kuliah</p>
            <p className="page-sub">Kelola data mata kuliah</p>
          </div>
          <button className="btn btn-primary" onClick={() => { setShowModal(true); setError(''); }}>+ Tambah</button>
        </div>

        {success && <div className="alert alert-green">{success}</div>}

        <div className="card">
          {loading ? <div className="empty-state">Memuat data...</div>
          : courses.length === 0 ? <div className="empty-state">Belum ada data mata kuliah</div>
          : (
            <div className="table-wrap">
              <table className="data-table">
                <thead><tr><th>#</th><th>Kode</th><th>Nama</th><th>Dosen</th><th>SKS</th><th>Peserta</th><th></th></tr></thead>
                <tbody>
                  {courses.map((c, i) => (
                    <tr key={c.id}>
                      <td style={{ color: 'var(--text-3)' }}>{i + 1}</td>
                      <td><span className="badge badge-purple">{c.code}</span></td>
                      <td style={{ fontWeight: 500, color: 'var(--text-1)' }}>{c.name}</td>
                      <td>{c.lecturer_name}</td>
                      <td>{c.credits} SKS</td>
                      <td>{c.student_count || 0} mahasiswa</td>
                      <td style={{ display: 'flex', gap: 8 }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => openEnrollmentModal(c)}>Kelola Peserta</button>
                        <button className="btn btn-danger-soft btn-sm" onClick={() => handleDelete(c.id)}>Hapus</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {showModal && (
          <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
            <div className="modal">
              <h2 className="modal-title">Tambah Mata Kuliah</h2>
              {error && <div className="alert alert-red">{error}</div>}
              <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: 14 }}>
                  <label className="input-label">Kode</label>
                  <input type="text" className="input" value={form.code} onChange={e => setForm({...form, code: e.target.value})} required />
                </div>
                <div style={{ marginBottom: 14 }}>
                  <label className="input-label">Nama Mata Kuliah</label>
                  <input type="text" className="input" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
                </div>
                <div style={{ marginBottom: 14 }}>
                  <label className="input-label">Dosen Pengampu</label>
                  <select className="select-field input" value={form.lecturer_id} onChange={e => setForm({...form, lecturer_id: e.target.value})} required>
                    <option value="">Pilih Dosen</option>
                    {lecturers.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                  </select>
                </div>
                <div style={{ marginBottom: 14 }}>
                  <label className="input-label">SKS</label>
                  <input type="number" className="input" value={form.credits} onChange={e => setForm({...form, credits: e.target.value})} required />
                </div>
                <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                  <button type="submit" className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }}>Simpan</button>
                  <button type="button" className="btn btn-ghost" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setShowModal(false)}>Batal</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showEnrollmentModal && selectedCourse && (
          <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && setShowEnrollmentModal(false)}>
            <div className="modal" style={{ maxWidth: 760 }}>
              <h2 className="modal-title">Peserta Mata Kuliah: {selectedCourse.name}</h2>
              {error && <div className="alert alert-red">{error}</div>}

              <div style={{ marginBottom: 16 }}>
                <label className="input-label">Assign Mahasiswa</label>
                <select
                  className="select-field input"
                  multiple
                  value={selectedStudentIds.map(String)}
                  onChange={(e) => setSelectedStudentIds(Array.from(e.target.selectedOptions).map((opt) => Number(opt.value)))}
                  style={{ minHeight: 160 }}
                >
                  {availableStudents.length === 0 ? (
                    <option disabled>Tidak ada mahasiswa tersedia</option>
                  ) : (
                    availableStudents.map((s) => (
                      <option key={s.id} value={s.id}>{s.nim} - {s.name}</option>
                    ))
                  )}
                </select>
                <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 8 }}>Gunakan Ctrl / Cmd untuk memilih lebih dari satu mahasiswa.</p>
                <button className="btn btn-primary btn-sm" type="button" onClick={handleAssignStudents} disabled={selectedStudentIds.length === 0}>
                  Assign ke Mata Kuliah
                </button>
              </div>

              <div className="card" style={{ marginTop: 16 }}>
                {enrolledStudents.length === 0 ? (
                  <div className="empty-state">Belum ada mahasiswa yang diassign</div>
                ) : (
                  <div className="table-wrap">
                    <table className="data-table">
                      <thead><tr><th>NIM</th><th>Nama</th><th>Email</th><th></th></tr></thead>
                      <tbody>
                        {enrolledStudents.map((student) => (
                          <tr key={student.student_id}>
                            <td style={{ fontWeight: 500, color: 'var(--text-1)' }}>{student.nim}</td>
                            <td>{student.name}</td>
                            <td style={{ fontSize: 12 }}>{student.email || '—'}</td>
                            <td>
                              <button className="btn btn-danger-soft btn-sm" onClick={() => handleRemoveEnrollment(student.student_id)}>
                                Keluarkan
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                <button type="button" className="btn btn-ghost" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setShowEnrollmentModal(false)}>Tutup</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
