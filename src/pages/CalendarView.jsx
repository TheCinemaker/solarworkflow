import { useNavigate } from 'react-router-dom';
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

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
      color: isSelected 
        ? '#fff' 
        : isToday 
          ? '#4f8ef7' 
          : 'var(--t1)'
    };
  };

  return (
    <div className="page active scroll-area" id="p-calendar">
      <div className="back-btn fu" onClick={() => navigate('/')}>‹ Vissza a Dashboardra</div>
      
      {/* Fejléc Hónapválasztóval */}
      <div className="page-header fu flex items-center justify-between">
        <div>
          <div className="pg-greet">{currentYear}</div>
          <div className="pg-title">{HUNGARIAN_MONTHS[currentMonth]}</div>
        </div>
        <div className="flex items-center space-x-1">
          <button 
            onClick={prevMonth} 
            className="w-8 h-8 rounded-xl flex items-center justify-center transition-all hover:bg-white/5 active:scale-95 text-base font-bold"
            style={{ background: 'var(--s1)', border: '1px solid var(--b1)', color: 'var(--t1)' }}
          >
            ‹
          </button>
          <button 
            onClick={nextMonth} 
            className="w-8 h-8 rounded-xl flex items-center justify-center transition-all hover:bg-white/5 active:scale-95 text-base font-bold"
            style={{ background: 'var(--s1)', border: '1px solid var(--b1)', color: 'var(--t1)' }}
          >
            ›
          </button>
        </div>
      </div>

      {/* 📅 NAPTÁR GRID */}
      <div className="mx-5 mb-5 p-4 fu d1" style={{ background: 'var(--s1)', border: '1px solid var(--b1)', borderRadius: '16px' }}>
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

            return (
              <div 
                key={`day-${day}`}
                style={getDayCellStyle(day, isSelected, hasProjects)}
                onClick={() => setSelectedDay(day)}
                className="hover:bg-white/[0.04] transition-all"
              >
                <span>{day}</span>
                {/* Kis zöld pötty ha van munka aznap */}
                {hasProjects && (
                  <span 
                    className="absolute bottom-1.5 w-1 h-1 rounded-full animate-pulse"
                    style={{ 
                      background: isSelected ? '#fff' : '#2ed158',
                      boxShadow: isSelected ? 'none' : '0 0 4px #2ed158' 
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 📋 NAPI BEOSZTÁS RÉSZLETES LISTÁJA */}
      <div className="shdr fu d2 flex justify-between items-center px-5 mb-3">
        <div className="shdr-t">
          {HUNGARIAN_MONTHS[currentMonth]} {selectedDay}. ({selectedDayOfWeekName}) Beosztás
        </div>
        {selectedDayProjects.length > 0 && (
          <span style={{ fontSize: '9px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--green)', padding: '3px 9px', borderRadius: '20px', background: 'rgba(46,209,88,0.10)', border: '1px solid rgba(46,209,88,0.20)' }}>
            {selectedDayProjects.length} munka
          </span>
        )}
      </div>

      <div className="act-list fu d3" style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: '12px', paddingBottom: '90px' }}>
        {selectedDayProjects.length === 0 ? (
          <div className="p-6 text-center w-full" style={{ background: 'var(--s1)', border: '1px dashed var(--b2)', borderRadius: '16px', fontSize: '13px', color: 'var(--t3)', fontStyle: 'italic' }}>
            🍀 Nincs ütemezett munka mára.
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
                className="p-3.5 flex items-center justify-between cursor-pointer transition-all"
                style={{ background: 'var(--s1)', border: '1px solid var(--b1)', borderRadius: '16px' }}
                onClick={() => navigate(`/project/${proj.id}`)}
              >
                <div className="flex items-center space-x-3.5 text-left">
                  <div style={{
                    width: '40px', height: '40px', borderRadius: '10px', flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px',
                    background: proj.is_solar ? 'rgba(255,214,10,0.12)' : 'rgba(79,142,247,0.12)',
                    border: proj.is_solar ? '1px solid rgba(255,214,10,0.20)' : '1px solid rgba(79,142,247,0.20)',
                  }}>
                    {proj.is_solar ? '☀️' : '⚡'}
                  </div>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--t1)' }}>{proj.name}</div>
                    <div style={{ fontSize: '10px', color: 'var(--t3)', marginTop: '2px' }}>📍 {proj.address}</div>
                    <div style={{ fontSize: '9px', color: 'var(--t3)', fontWeight: '600', marginTop: '3px' }}>
                      Ütemezés: {proj.start_time} – {proj.end_time}
                    </div>
                  </div>
                </div>

                <div className="text-right flex flex-col items-end">
                  <span style={{ fontSize: '10px', fontWeight: '700', color: 'var(--t2)' }}>{progress}% kész</span>
                  <div style={{ width: '48px', background: 'var(--s2)', height: '3px', borderRadius: '4px', overflow: 'hidden', marginTop: '5px' }}>
                    <div style={{ height: '100%', borderRadius: '4px', width: `${progress}%`, background: proj.is_solar ? 'var(--yellow)' : 'var(--blue)' }} />
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
