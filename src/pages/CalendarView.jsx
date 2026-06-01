import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Icon } from '../components/Icon';

const HUNGARIAN_MONTHS = [
  'Január', 'Február', 'Március', 'Április', 'Május', 'Június',
  'Július', 'Augusztus', 'Szeptember', 'Október', 'November', 'December'
];

const HUNGARIAN_DAYS = ['Vasárnap', 'Hétfő', 'Kedd', 'Szerda', 'Csütörtök', 'Péntek', 'Szombat'];

export default function CalendarView() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  
  // Naptár nézet állapota
  const today = new Date();
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState(today.getDate());

  useEffect(() => {
    async function fetchProjects() {
      const { data } = await supabase
        .from('projects')
        .select('*')
        .eq('archived', false);
      if (data) setProjects(data);
    }
    fetchProjects();

    // REALTIME SUBSCRIBER: Élő szinkronizáció
    const channel = supabase
      .channel('calendar-realtime-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, () => { fetchProjects(); })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Hónap váltó függvények
  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
    setSelectedDay(1);
  };

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
    setSelectedDay(1);
  };

  // Naptár generálásához szükséges adatok
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  
  // Magyar beosztás szerinti első nap (Hétfő = 0, Kedd = 1, ..., Vasárnap = 6)
  const firstDayOfWeek = (new Date(currentYear, currentMonth, 1).getDay() + 6) % 7;

  // Kiválasztott nap formázása
  const selectedDateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`;
  const selectedDayOfWeekName = HUNGARIAN_DAYS[new Date(currentYear, currentMonth, selectedDay).getDay()];

  // Egy adott napra aktív projektek kiszűrése (start_time <= nap és end_time >= nap)
  const getProjectsForDay = (day) => {
    const dayStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return projects.filter(proj => {
      if (!proj.start_time || !proj.end_time) return false;
      return proj.start_time <= dayStr && proj.end_time >= dayStr;
    });
  };

  // A jelenleg kiválasztott nap projektjei
  const selectedDayProjects = getProjectsForDay(selectedDay);

  // Nap cella stílusok
  const getDayCellStyle = (day, isSelected, hasProjects) => {
    const isToday = today.getDate() === day && today.getMonth() === currentMonth && today.getFullYear() === currentYear;
    
    return {
      aspectRatio: '1',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: '12px',
      fontSize: '13px',
      fontWeight: isSelected || isToday ? 'bold' : '500',
      cursor: 'pointer',
      transition: 'all 0.15s ease',
      position: 'relative',
      background: isSelected 
        ? 'linear-gradient(135deg, #4f8ef7, #2a5ccc)' 
        : isToday 
          ? 'rgba(79, 142, 247, 0.15)' 
          : 'transparent',
      border: isToday && !isSelected 
        ? '1px solid rgba(79, 142, 247, 0.4)' 
        : '1px solid transparent',
      boxShadow: isSelected 
        ? '0 4px 12px rgba(79, 142, 247, 0.35)' 
        : 'none',
      color: isSelected 
        ? '#fff' 
        : isToday 
          ? '#4f8ef7' 
          : 'var(--t1)'
    };
  };

  return (
    <div className="page active" id="p-calendar">
      {/* Elegáns Vissza gomb */}
      <div 
        onClick={() => navigate('/')}
        className="cursor-pointer transition-all active:scale-95 flex items-center"
        style={{ 
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px', 
          fontSize: '13px', 
          fontWeight: 'bold', 
          color: 'var(--t2)', 
          marginLeft: '15px', 
          marginTop: '15px',
          marginBottom: '5px'
        }}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6"></polyline>
        </svg>
        <span>Vissza</span>
      </div>
      
      {/* Fejléc Hónapválasztóval */}
      <div className="page-header fu flex items-center justify-between" style={{ marginLeft: '15px', marginRight: '15px', marginBottom: '15px' }}>
        <div>
          <div className="pg-greet">{currentYear}</div>
          <div className="pg-title">{HUNGARIAN_MONTHS[currentMonth]}</div>
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          {[['‹', prevMonth], ['›', nextMonth]].map(([label, handler]) => (
            <button
              key={label}
              onClick={handler}
              className="active:scale-95 transition-all"
              style={{
                width: '32px', height: '32px', borderRadius: '10px', display: 'flex',
                alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: '700',
                background: 'var(--s1)', border: '1px solid var(--b1)', color: 'var(--t1)',
                cursor: 'pointer', fontFamily: 'inherit', transition: 'background 0.15s',
              }}
            >{label}</button>
          ))}
        </div>
      </div>

      {/* NAPTÁR GRID */}
      <div className="mb-5 p-4 fu d1" style={{ background: 'var(--s1)', border: '1px solid var(--b1)', borderRadius: '16px', marginLeft: '15px', marginRight: '15px' }}>
        {/* Hét napjai fejléc */}
        <div className="grid grid-cols-7 gap-1 text-center mb-2">
          {['H', 'K', 'Sze', 'Cs', 'P', 'Szo', 'V'].map((d, i) => (
            <div key={i} style={{ fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--t3)', letterSpacing: '0.06em', padding: '4px 0' }}>
              {d}
            </div>
          ))}
        </div>

        {/* Napok rácsa */}
        <div className="grid grid-cols-7 gap-1.5 text-center">
          {/* Első nap előtti üres napok */}
          {Array.from({ length: firstDayOfWeek }).map((_, idx) => (
            <div key={`empty-${idx}`} />
          ))}

          {/* Hónap napjai */}
          {Array.from({ length: daysInMonth }).map((_, idx) => {
            const day = idx + 1;
            const isSelected = selectedDay === day;
            const dayProjects = getProjectsForDay(day);
            const hasProjects = dayProjects.length > 0;
            const hasSolar = dayProjects.some(p => p.is_solar);
            const dotColor = hasSolar ? '#ffd60a' : '#2ed158';

            return (
              <div 
                key={`day-${day}`}
                style={getDayCellStyle(day, isSelected, hasProjects)}
                onClick={() => setSelectedDay(day)}
                className="hover:bg-white/[0.04] active:scale-90 transition-all"
              >
                <span>{day}</span>
                {/* Kis pötty ha van munka aznap */}
                {hasProjects && (
                  <span 
                    className="absolute bottom-1.5 w-1.5 h-1.5 rounded-full"
                    style={{ 
                      background: isSelected ? '#fff' : dotColor,
                      boxShadow: isSelected ? 'none' : `0 0 5px ${dotColor}` 
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* NAPI BEOSZTÁS RÉSZLETES LISTÁJA */}
      <div className="shdr fu d2 flex justify-between items-center mb-3" style={{ marginLeft: '15px', marginRight: '15px' }}>
        <div className="shdr-t">
          {HUNGARIAN_MONTHS[currentMonth]} {selectedDay}. ({selectedDayOfWeekName}) Beosztás
        </div>
        {selectedDayProjects.length > 0 && (
          <span style={{ fontSize: '9px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--green)', padding: '3px 9px', borderRadius: '20px', background: 'rgba(46,209,88,0.10)', border: '1px solid rgba(46,209,88,0.20)' }}>
            {selectedDayProjects.length} munka
          </span>
        )}
      </div>

      <div className="act-list fu d3" style={{ paddingLeft: '15px', paddingRight: '15px', display: 'flex', flexDirection: 'column', gap: '12px', paddingBottom: '90px' }}>
        {selectedDayProjects.length === 0 ? (
          <div className="p-6 text-center w-full" style={{ background: 'var(--s1)', border: '1px solid var(--b1)', borderRadius: '16px', fontSize: '13px', color: 'var(--t3)', fontStyle: 'italic', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
            <Icon name="sparkles" size={13} color="var(--t3)" strokeWidth={2} /> Nincs ütemezett munka mára.
          </div>
        ) : (
          selectedDayProjects.map(proj => {
            const tasksList = proj.tasks ? proj.tasks.split('\n').map(t => t.trim()).filter(Boolean) : [];
            const totalTasks = tasksList.length;
            const completedCount = proj.completed_tasks ? proj.completed_tasks.length : 0;
            const progress = totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0;

            return (
              <div
                key={proj.id}
                className="pc animate-[fadeIn_0.2s_ease-out] active:scale-[0.98] transition-all"
                style={{
                  width: '100%',
                  border: '1px solid var(--b1)',
                  background: 'var(--s1)',
                  padding: '16px',
                  borderRadius: '16px',
                  cursor: 'pointer',
                  display: 'block'
                }}
                onClick={() => navigate(`/project/${proj.id}`)}
              >
                {/* Felső jelvény és dátum sor */}
                <div className="flex items-center justify-between mb-3" style={{ display: 'flex', alignItems: 'center', justifyContent: 'between', width: '100%' }}>
                  <div style={{
                    background: proj.is_solar ? 'rgba(255, 214, 10, 0.12)' : 'rgba(46, 209, 88, 0.14)',
                    color: proj.is_solar ? '#ffd60a' : '#2ed158',
                    fontSize: '10px',
                    fontWeight: '800',
                    padding: '4px 10px',
                    borderRadius: '20px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px'
                  }}>
                    <Icon name={proj.is_solar ? 'sun' : 'bolt'} size={11} strokeWidth={2.5} />
                    <span>{proj.is_solar ? 'Napelem' : 'Projekt'}{proj.serial_number ? ` · ${proj.serial_number}` : ''}</span>
                  </div>

                  <div style={{ fontSize: '10px', color: 'var(--t3)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                    <Icon name="calendar" size={11} color="var(--t3)" strokeWidth={2.2} /> {proj.start_time} – {proj.end_time}
                  </div>
                </div>

                {/* Projekt Név */}
                <div style={{ fontSize: '14px', fontWeight: '800', color: 'var(--t1)', marginBottom: '6px', textAlign: 'left', lineHeight: '1.3' }}>
                  {proj.name}
                </div>

                {/* Cím */}
                <div style={{ fontSize: '11px', color: 'var(--t2)', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '5px', textAlign: 'left' }}>
                  <Icon name="pin" size={12} color="var(--t3)" strokeWidth={2} />
                  <span>{proj.address}</span>
                </div>

                {/* Haladási csík (Teljes szélességű) */}
                <div style={{ height: '4px', background: 'var(--s2)', borderRadius: '10px', overflow: 'hidden', marginBottom: '8px', width: '100%' }}>
                  <div 
                    style={{
                      height: '100%',
                      borderRadius: '10px',
                      width: `${progress}%`,
                      background: proj.is_solar ? '#ffd60a' : '#2ed158',
                      boxShadow: proj.is_solar ? '0 0 8px rgba(255, 214, 10, 0.4)' : '0 0 8px rgba(46, 209, 88, 0.4)'
                    }}
                  ></div>
                </div>

                {/* Alsó állapot és százalék sor */}
                <div className="flex items-center justify-between" style={{ display: 'flex', alignItems: 'center', justifyContent: 'between', fontSize: '11px', fontWeight: '700', width: '100%' }}>
                  <span style={{ color: 'var(--t2)' }}>
                    Haladás: <span style={{ color: proj.is_solar ? '#ffd60a' : '#2ed158' }}>{progress}% kész</span>
                  </span>
                  <span style={{ 
                    background: progress === 100 ? 'rgba(46, 209, 88, 0.12)' : 'rgba(79, 142, 247, 0.12)', 
                    color: progress === 100 ? '#2ed158' : 'var(--blue)', 
                    border: progress === 100 ? '1px solid rgba(46, 209, 88, 0.2)' : '1px solid rgba(79, 142, 247, 0.2)', 
                    padding: '2px 8px', 
                    borderRadius: '12px', 
                    fontSize: '9px', 
                    fontWeight: '800', 
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em'
                  }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      {progress === 100 ? (<><span>Befejezve</span><Icon name="check" size={10} color="var(--green)" strokeWidth={3} /></>) : 'Folyamatban'}
                    </span>
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
