import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Icon } from '../components/Icon';

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
    marginBottom: '4px',
    display: 'block'
  };

  if (loading) {
    return (
      <div className="page active flex items-center justify-center h-screen text-[var(--t3)]">
        Munkalapok betöltése...
      </div>
    );
  }

  return (
    <div className="page active" id="p-daily">
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
      
      <div className="page-header fu" style={{ marginLeft: '15px', marginRight: '15px', marginBottom: '15px' }}>
        <div>
          <div className="pg-greet">{new Date().toLocaleDateString('hu-HU')}</div>
          <div className="pg-title">Napi lap</div>
        </div>
        <div className="hdr-btn"><Icon name="clipboard" size={16} color="var(--t2)" strokeWidth={2.2} /></div>
      </div>

      {error && (
        <div style={{ marginLeft: '15px', marginRight: '15px', marginTop: '16px', padding: '12px', background: 'rgba(255, 59, 48, 0.1)', border: '1px solid rgba(255, 59, 48, 0.2)', color: 'var(--red)', borderRadius: '16px', fontSize: '12px' }}>
          {error}
        </div>
      )}

      {/* 1. Munkalap rögzítése űrlap */}
      <div className="shdr fu d1" style={{ marginLeft: '15px', marginRight: '15px', marginBottom: '10px' }}>
        <div className="shdr-t">Új Munkalap Rögzítése</div>
      </div>

      <div className="gcard fu d1" style={{ background: 'var(--s1)', border: '1px solid var(--b1)', borderRadius: '16px', marginLeft: '15px', marginRight: '15px', marginBottom: '25px', padding: '16px' }}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div>
            <label style={labelStyle}>Projekt / Helyszín</label>
            <select 
              value={selectedProjectId} 
              onChange={(e) => setSelectedProjectId(e.target.value)}
              required 
              style={inputStyle}
            >
              <option value="" style={{ background: 'var(--bg)' }}>Válassz projektet...</option>
              {projects.map(proj => (
                <option key={proj.id} value={proj.id} style={{ background: 'var(--bg)' }}>
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
            <div className="p-2.5 text-xs font-semibold text-center" style={{ background: 'rgba(46, 209, 88, 0.1)', border: '1px solid rgba(46, 209, 88, 0.2)', color: 'var(--green)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
              <Icon name="clock" size={13} color="var(--green)" strokeWidth={2.2} /> Számolt munkaidő: {computedHours} óra
            </div>
          )}

          <div>
            <label style={labelStyle}>Rövid munkaleírás (opcionális)</label>
            <textarea 
              value={description} 
              onChange={(e) => setDescription(e.target.value)} 
              placeholder="pl. Napelemek felrakása a tetőre, inverter bekötése..."
              style={{ ...inputStyle, minHeight: '120px', resize: 'vertical' }}
            />
          </div>

          <div className="flex justify-center pt-2" style={{ display: 'flex', justifyContent: 'center', width: '100%', paddingTop: '8px' }}>
            <button 
              type="submit" 
              disabled={saving} 
              className="btn active:scale-95 transition-all flex items-center justify-center cursor-pointer" 
              style={{ 
                background: 'var(--gradient-blue)', 
                border: 'none', 
                borderRadius: '12px', 
                color: '#fff', 
                padding: '12px 28px',
                fontSize: '13px', 
                fontWeight: '700',
                gap: '8px',
                boxShadow: '0 4px 15px rgba(79, 142, 247, 0.25)',
                animation: 'premium-breathe 3s infinite ease-in-out',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 'fit-content'
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
              </svg>
              <span>{saving ? 'Mentés...' : 'Munkalap Beküldése'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* 2. Rögzített munkalapok listája */}
      <div className="shdr fu d2" style={{ marginLeft: '15px', marginRight: '15px', marginBottom: '10px' }}>
        <div className="shdr-t">Rögzített Munkalapok</div>
        <div className="shdr-a">{worklogs.length} db</div>
      </div>

      <div className="space-y-4 pb-20 fu d2" style={{ paddingLeft: '15px', paddingRight: '15px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {worklogs.length === 0 ? (
          <div className="text-center py-8" style={{ background: 'var(--s1)', border: '1px solid var(--b1)', borderRadius: '16px', fontSize: '13px', color: 'var(--t3)', fontStyle: 'italic' }}>
            Még nincsenek rögzített munkalapok.
          </div>
        ) : (
          worklogs.map(log => (
            <div 
              key={log.id} 
              className="p-5 flex flex-col space-y-4 active:scale-[0.99] transition-all" 
              style={{ 
                background: 'var(--s1)', 
                border: '1px solid var(--b1)', 
                borderRadius: '16px', 
                backdropFilter: 'blur(12px)', 
                WebkitBackdropFilter: 'blur(12px)',
                padding: '20px'
              }}
            >
              <div className="flex justify-between items-start" style={{ display: 'flex', justifyContent: 'between', alignItems: 'start', width: '100%' }}>
                <div>
                  <div style={{ fontSize: '9px', color: 'var(--t3)', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>Szerelő</div>
                  <div style={{ fontWeight: '700', color: 'var(--t1)', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Icon name="worker" size={14} color="var(--t1)" strokeWidth={2} />
                    <span>{log.profiles?.full_name || (log.user_id === currentUser?.id ? (currentUser?.user_metadata?.full_name || currentUser?.full_name || 'Én') : 'Ismeretlen')} {log.profiles?.serial_number ? `[${log.profiles.serial_number}]` : (log.user_id === currentUser?.id && currentUser?.role === 'admin' ? '[ADM-01]' : '')}</span>
                  </div>
                </div>
                <div style={{ fontSize: '10px', color: 'var(--blue)', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '4px 10px', borderRadius: '20px', background: 'rgba(79,142,247,0.10)', border: '1px solid rgba(79,142,247,0.18)' }}>
                  {log.date}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4" style={{ borderTop: '1px solid var(--b1)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', paddingTop: '16px' }}>
                <div>
                  <div style={{ fontSize: '9px', color: 'var(--t3)', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>Projekt</div>
                  <div style={{ fontWeight: '700', color: 'var(--t1)', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Icon name="bolt" size={13} color="var(--blue)" strokeWidth={2.5} />
                    <span>{log.projects?.name || 'Névtelen Projekt'}</span>
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '9px', color: 'var(--t3)', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>Időtartam</div>
                  <div style={{ fontWeight: '700', color: 'var(--t1)', fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '2px', alignItems: 'start' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Icon name="clock" size={13} color="var(--t1)" strokeWidth={2.2} /> {log.hours} óra</span>
                    <span style={{ fontSize: '10px', color: 'var(--t3)', fontWeight: '500' }}>({log.start_time} – {log.end_time})</span>
                  </div>
                </div>
              </div>

              <div className="pt-4" style={{ borderTop: '1px solid var(--b1)', paddingTop: '16px' }}>
                <div style={{ fontSize: '9px', color: 'var(--t3)', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px', textAlign: 'left' }}>Munkaleírás</div>
                <div style={{ fontSize: '12px', color: 'var(--t2)', fontStyle: 'italic', background: 'var(--s2)', padding: '12px 14px', borderRadius: '12px', border: '1px solid var(--b1)', lineHeight: '1.6', textAlign: 'left' }}>
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
