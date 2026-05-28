import { useNavigate } from 'react-router-dom';
import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export default function Timesheet() {
  const navigate = useNavigate();
  
  // Űrlap állapotok
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('16:00');
  const [description, setDescription] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  
  // Adatlista állapotok
  const [worklogs, setWorklogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Aktív projektek, a bejelentkezett felhasználó és a meglévő munkalapok betöltése
  async function loadData() {
    try {
      // 1. Felhasználó lekérése
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);

      // 2. Aktív projektek lekérése a legördülőhöz
      const { data: projData } = await supabase
        .from('projects')
        .select('id, name, serial_number')
        .order('name');
      if (projData) setProjects(projData);

      // 3. Munkalapok lekérése (dolgozó névvel és projekt névvel összekapcsolva)
      const { data: logsData, error: logsErr } = await supabase
        .from('worklogs')
        .select(`
          id,
          date,
          hours,
          start_time,
          end_time,
          description,
          created_at,
          profiles (full_name, serial_number),
          projects (name, serial_number)
        `)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false });

      if (logsErr) throw logsErr;
      if (logsData) setWorklogs(logsData);

    } catch (err) {
      console.error("Hiba az adatok betöltésekor:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();

    // REALTIME SUBSCRIBER: Valós idejű szinkronizáció
    const channel = supabase
      .channel('worklogs-realtime-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'worklogs' }, () => {
        loadData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Időtartam kiszámítása órában (pl. 08:00 és 16:30 között -> 8.5 óra)
  const calculateHours = () => {
    if (!startTime || !endTime) return 0;
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);
    
    const startDecimal = startHour + startMin / 60;
    const endDecimal = endHour + endMin / 60;
    
    const diff = endDecimal - startDecimal;
    return diff > 0 ? parseFloat(diff.toFixed(2)) : 0;
  };

  const computedHours = calculateHours();

  // Munkalap beküldése
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedProjectId) {
      setError("Kérlek válassz egy projektet!");
      return;
    }
    if (computedHours <= 0) {
      setError("A befejezési időnek a kezdési idő után kell lennie!");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const { error: insertErr } = await supabase
        .from('worklogs')
        .insert([{
          project_id: selectedProjectId,
          user_id: currentUser?.id,
          date,
          start_time: startTime,
          end_time: endTime,
          hours: computedHours,
          description: description || 'Napi munkavégzés'
        }]);

      if (insertErr) throw insertErr;

      // Sikeres beküldés után űrlap alaphelyzetbe
      setDescription('');
      setSelectedProjectId('');
      alert("Munkalap sikeresen elmentve!");
      
      // Újratöltés
      await loadData();
    } catch (err) {
      console.error("Hiba a mentés során:", err);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = {
    background: 'var(--s1)',
    border: '1px solid var(--b1)',
    borderRadius: 'var(--input-r)',
    padding: '9px 12px',
    color: 'var(--t1)',
    fontSize: '13px',
    width: '100%',
    outline: 'none',
    transition: 'border-color 0.15s ease'
  };

  const labelStyle = {
    color: 'var(--t3)',
    fontSize: '11px',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: '0.07em',
    marginBottom: '2px',
    display: 'block'
  };

  if (loading) {
    return (
      <div className="page active flex items-center justify-center h-screen text-slate-400">
        Munkalapok betöltése...
      </div>
    );
  }

  return (
    <div className="page active" id="p-daily">
      <div className="back-btn fu" onClick={() => navigate('/')}>‹ Vissza a Dashboardra</div>
      
      <div className="page-header fu">
        <div>
          <div className="pg-greet">{new Date().toLocaleDateString('hu-HU')}</div>
          <div className="pg-title">Napi lap</div>
        </div>
        <div className="hdr-btn">📋</div>
      </div>

      {error && (
        <div style={{ marginLeft: '15px', marginRight: '15px', marginTop: '16px', padding: '12px', background: 'rgba(255, 59, 48, 0.1)', border: '1px solid rgba(255, 59, 48, 0.2)', color: 'var(--red)', borderRadius: 'var(--card-r)', fontSize: '12px' }}>
          {error}
        </div>
      )}

      {/* 1. Munkalap rögzítése űrlap */}
      <div className="shdr fu d1">
        <div className="shdr-t">Új Munkalap Rögzítése</div>
      </div>

      <div className="gcard fu d1" style={{ background: 'var(--s1)', border: '1px solid var(--b1)' }}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label style={labelStyle}>Projekt / Helyszín</label>
            <select 
              value={selectedProjectId} 
              onChange={(e) => setSelectedProjectId(e.target.value)}
              required 
              style={inputStyle}
            >
              <option value="" style={{ background: '#07090f' }}>Válassz projektet...</option>
              {projects.map(proj => (
                <option key={proj.id} value={proj.id} style={{ background: '#07090f' }}>
                  {proj.serial_number ? `[${proj.serial_number}] ` : ''}{proj.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={labelStyle}>Dátum</label>
            <input 
              type="date" 
              value={date} 
              onChange={(e) => setDate(e.target.value)} 
              required 
              style={inputStyle} 
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label style={labelStyle}>Kezdés (Mettől)</label>
              <input 
                type="time" 
                value={startTime} 
                onChange={(e) => setStartTime(e.target.value)} 
                required 
                style={inputStyle} 
              />
            </div>
            <div>
              <label style={labelStyle}>Befejezés (Meddig)</label>
              <input 
                type="time" 
                value={endTime} 
                onChange={(e) => setEndTime(e.target.value)} 
                required 
                style={inputStyle} 
              />
            </div>
          </div>

          {computedHours > 0 && (
            <div className="p-2.5 text-xs font-semibold text-center" style={{ background: 'rgba(46, 209, 88, 0.1)', border: '1px solid rgba(46, 209, 88, 0.2)', color: 'var(--green)', borderRadius: 'var(--card-r)' }}>
              ⏱ Számolt munkaidő: {computedHours} óra
            </div>
          )}

          <div>
            <label style={labelStyle}>Rövid munkaleírás (opcionális)</label>
            <textarea 
              value={description} 
              onChange={(e) => setDescription(e.target.value)} 
              placeholder="pl. Napelemek felrakása a tetőre, inverter bekötése..."
              style={{ ...inputStyle, minHeight: '60px', resize: 'vertical' }}
            />
          </div>

          <button 
            type="submit" 
            disabled={saving} 
            className="w-full font-bold transition-all disabled:opacity-50 flex items-center justify-center pt-3 pb-3" 
            style={{ 
              background: 'linear-gradient(135deg, #4f8ef7, #2a5ccc)', 
              border: 'none', 
              borderRadius: 'var(--btn-r)', 
              color: '#fff', 
              fontSize: '14px', 
              boxShadow: '0 6px 20px rgba(79, 142, 247, 0.30)' 
            }}
          >
            {saving ? 'Mentés...' : 'Munkalap Beküldése'}
          </button>
        </form>
      </div>

      {/* 2. Rögzített munkalapok listája */}
      <div className="shdr fu d2">
        <div className="shdr-t">Rögzített Munkalapok</div>
        <div className="shdr-a">{worklogs.length} db</div>
      </div>

      <div className="space-y-4 pb-20 fu d2" style={{ paddingLeft: '15px', paddingRight: '15px' }}>
        {worklogs.length === 0 ? (
          <div className="text-center py-8" style={{ background: 'var(--s1)', border: '1px solid var(--b1)', borderRadius: 'var(--card-r)', fontSize: '13px', color: 'var(--t3)', fontStyle: 'italic' }}>
            Még nincsenek rögzített munkalapok.
          </div>
        ) : (
          worklogs.map(log => (
            <div key={log.id} className="p-4 flex flex-col space-y-3" style={{ background: 'var(--s1)', border: '1px solid var(--b1)', borderRadius: 'var(--card-r)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}>
              <div className="flex justify-between items-start">
                <div>
                  <div style={{ fontSize: '10px', color: 'var(--t3)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>Szerelő</div>
                  <div style={{ fontWeight: '600', color: 'var(--t1)', fontSize: '14px' }}>
                    👷 {log.profiles?.full_name || (log.user_id === currentUser?.id ? (currentUser?.user_metadata?.full_name || currentUser?.full_name || 'Én') : 'Ismeretlen')} {log.profiles?.serial_number ? `[${log.profiles.serial_number}]` : (log.user_id === currentUser?.id && currentUser?.role === 'admin' ? '[ADM-01]' : '')}
                  </div>
                </div>
                <div style={{ fontSize: '10px', color: 'var(--blue)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '3px 9px', borderRadius: '20px', background: 'rgba(79,142,247,0.10)', border: '1px solid rgba(79,142,247,0.18)' }}>
                  {log.date}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-3" style={{ borderTop: '1px solid var(--b1)' }}>
                <div>
                  <div style={{ fontSize: '10px', color: 'var(--t3)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>Projekt</div>
                  <div style={{ fontWeight: '600', color: 'var(--t1)', fontSize: '13px' }}>
                    ⚡ {log.projects?.name || 'Névtelen Projekt'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '10px', color: 'var(--t3)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>Időtartam</div>
                  <div style={{ fontWeight: '600', color: 'var(--t1)', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>⏱ {log.hours} óra</span>
                    <span style={{ fontSize: '10px', color: 'var(--t3)' }}>({log.start_time} – {log.end_time})</span>
                  </div>
                </div>
              </div>

              <div className="pt-3" style={{ borderTop: '1px solid var(--b1)' }}>
                <div style={{ fontSize: '10px', color: 'var(--t3)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>Munkaleírás</div>
                <div style={{ fontSize: '12px', color: 'var(--t2)', fontStyle: 'italic', background: 'var(--s2)', padding: '10px 12px', borderRadius: 'var(--card-r)', border: '1px solid var(--b1)', lineHeight: '1.5' }}>
                  {log.description}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
