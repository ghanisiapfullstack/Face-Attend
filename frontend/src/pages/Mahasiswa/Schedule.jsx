import { useEffect, useState } from 'react';
import Sidebar from '../../components/Sidebar';
import api from '../../utils/api';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, MapPin, Clock } from 'lucide-react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, isSameMonth, isSameDay, addDays } from 'date-fns';

export default function MahasiswaSchedule() {
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());

  useEffect(() => {
    api.get('/api/schedules/student/my')
      .then((res) => setSchedules(res.data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const onDateClick = (day) => setSelectedDate(day);

  const getSchedulesForDay = (day) => {
    return schedules.filter(s => {
      const sDateStr = format(new Date(s.upcoming_regular_date), 'yyyy-MM-dd');
      const dayStr = format(day, 'yyyy-MM-dd');
      
      let hasOverride = false;
      if (s.overrides?.length) {
        hasOverride = s.overrides.some(o => format(new Date(o.replacement_date), 'yyyy-MM-dd') === dayStr);
      }

      return sDateStr === dayStr || hasOverride;
    });
  };

  const renderHeader = () => {
    return (
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: 'var(--text-1)' }}>
          {format(currentDate, 'MMMM yyyy')}
        </h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={prevMonth} className="btn btn-ghost" style={{ padding: 6 }}><ChevronLeft size={18} /></button>
          <button onClick={nextMonth} className="btn btn-ghost" style={{ padding: 6 }}><ChevronRight size={18} /></button>
        </div>
      </div>
    );
  };

  const renderDays = () => {
    const days = [];
    const startDate = startOfWeek(currentDate);
    for (let i = 0; i < 7; i++) {
      days.push(
        <div key={i} style={{ textAlign: 'center', fontSize: 12, fontWeight: 600, color: 'var(--text-3)', paddingBottom: 8, textTransform: 'uppercase' }}>
          {format(addDays(startDate, i), 'EEE')}
        </div>
      );
    }
    return <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: 8 }}>{days}</div>;
  };

  const renderCells = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const rows = [];
    let days = [];
    let day = startDate;

    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        const cloneDay = day;
        const sForDay = getSchedulesForDay(cloneDay);
        const hasSchedule = sForDay.length > 0;
        const isSelected = isSameDay(day, selectedDate);
        const isCurrentMonth = isSameMonth(day, monthStart);

        days.push(
          <div
            key={day}
            onClick={() => onDateClick(cloneDay)}
            style={{
              minHeight: 80,
              padding: 8,
              cursor: 'pointer',
              border: `1px solid ${isSelected ? 'var(--accent)' : 'var(--border)'}`,
              background: isSelected ? 'var(--surface2)' : !isCurrentMonth ? 'rgba(0,0,0,0.2)' : 'var(--surface)',
              transition: 'background 0.2s',
              opacity: !isCurrentMonth ? 0.6 : 1
            }}
          >
            <div style={{ textAlign: 'right', fontSize: 13, fontWeight: 500, color: isSelected ? 'var(--accent)' : 'var(--text-2)', marginBottom: 6 }}>
              {format(day, 'd')}
            </div>
            {hasSchedule && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {sForDay.slice(0, 2).map((sched, idx) => (
                  <div key={idx} style={{ background: 'var(--accent-bg)', color: 'var(--accent)', fontSize: 10, padding: '2px 4px', borderRadius: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {sched.course_name}
                  </div>
                ))}
                {sForDay.length > 2 && (
                  <div style={{ fontSize: 10, color: 'var(--text-3)', fontWeight: 500 }}>+{sForDay.length - 2} more</div>
                )}
              </div>
            )}
          </div>
        );
        day = addDays(day, 1);
      }
      rows.push(
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }} key={day}>
          {days}
        </div>
      );
      days = [];
    }
    return <div>{rows}</div>;
  };

  const selectedDaySchedules = getSchedulesForDay(selectedDate);

  return (
    <div className="layout">
      <Sidebar />
      <div className="main-content">
        <div style={{ marginBottom: 28 }}>
          <p className="page-title">Jadwal Kalender</p>
          <p className="page-sub">Klik pada tanggal untuk melihat detail rintisan kelas</p>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24 }}>
          {/* Calendar Box */}
          <div className="card" style={{ flex: '1 1 600px', padding: 20 }}>
            {renderHeader()}
            {renderDays()}
            {loading ? <div className="empty-state">Loading calendar...</div> : renderCells()}
          </div>

          {/* Details Box */}
          <div style={{ flex: '1 1 300px', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="card" style={{ padding: 20, background: 'var(--surface2)', borderColor: 'var(--accent)' }}>
              <div style={{ fontSize: 20, fontWeight: 600, color: 'var(--text-1)' }}>{format(selectedDate, 'EEEE')}</div>
              <div style={{ color: 'var(--accent)', fontWeight: 500 }}>{format(selectedDate, 'dd MMMM yyyy')}</div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <AnimatePresence mode="popLayout">
                {selectedDaySchedules.length === 0 ? (
                  <motion.div 
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="card" style={{ padding: 24, textAlign: 'center' }}
                  >
                    <div style={{ color: 'var(--text-3)' }}>Tidak ada jadwal kelas</div>
                  </motion.div>
                ) : (
                  selectedDaySchedules.map((schedule) => (
                    <motion.div 
                      layout
                      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
                      key={schedule.id}
                      className="card" style={{ padding: 20 }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--text-1)', fontSize: 15 }}>{schedule.course_name}</div>
                          <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{schedule.course_code || '—'}</div>
                        </div>
                        <span className="badge badge-purple">{schedule.day}</span>
                      </div>
                      
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-2)' }}>
                          <Clock size={14} /> {schedule.start_time.slice(0, 5)} - {schedule.end_time.slice(0, 5)}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-2)' }}>
                          <MapPin size={14} /> {schedule.room}
                        </div>
                      </div>

                      {schedule.overrides?.length > 0 && (
                        <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
                          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--amber)', textTransform: 'uppercase', marginBottom: 8 }}>Perubahan Jadwal</div>
                          {schedule.overrides.map(o => (
                            <div key={o.id} style={{ fontSize: 12, color: 'var(--text-2)', background: 'var(--surface2)', padding: 10, borderRadius: 6 }}>
                              {new Date(o.replacement_date).toLocaleDateString()} • {o.new_start_time.slice(0,5)} - {o.new_end_time.slice(0,5)} di {o.new_room}
                            </div>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
