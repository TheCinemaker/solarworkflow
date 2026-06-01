import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export default function ProjectList() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [activeTab, setActiveTab] = useState('active'); // 'active' vagy 'archived'
  const [searchQuery, setSearchQuery] = useState('');   // Valós idejű keresési lekérdezés

  async function fetchProjects() {
    const isArchived = activeTab === 'archived';
    const { data } = await supabase
      .from('projects')
      .select('*')
      .eq('archived', isArchived)
      .order('created_at', { ascending: false });
    
    if (data) setProjects(data);
  }

  useEffect(() => {
    fetchProjects();

    // REALTIME SUBSCRIBER: Valós idejű frissítés a projektek táblánál
    const channel = supabase
      .channel('projects-list-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, () => { fetchProjects(); })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeTab]);

  // Keresési szűrés név, cím vagy sorszám alapján
  const filteredProjects = projects.filter(proj => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;

    const nameMatch = proj.name ? proj.name.toLowerCase().includes(query) : false;
    const addrMatch = proj.address ? proj.address.toLowerCase().includes(query) : false;
    const serialMatch = proj.serial_number ? proj.serial_number.toLowerCase().includes(query) : false;
    
    return nameMatch || addrMatch || serialMatch;
  });

  return (
    <div className="page active">
      <div className="page-header fu flex items-center justify-between" style={{ marginBottom: '10px' }}>
        <div>
          <div className="pg-greet">VOLTDESK MUNKAÁLLOMÁS</div>
          <div className="pg-title">Projektek</div>
        </div>
        <div 
          className="hdr-btn" 
          onClick={() => navigate('/')} 
          title="Vissza a Dashboardra"
          style={{ padding: '0', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px' }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--t2)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
            <polyline points="9 22 9 12 15 12 15 22"></polyline>
          </svg>
        </div>
      </div>

      {/* TABS (Aktív / Archivált szűrő) */}
      <div className="flex items-center fu" style={{ marginLeft: '15px', marginRight: '15px', marginBottom: '16px', gap: '10px' }}>
        <div 
          onClick={() => {
            setActiveTab('active');
            setSearchQuery('');
          }} 
          className="cursor-pointer transition-all duration-200"
          style={{
            flex: 1,
            padding: '10px 0',
            textAlign: 'center',
            fontSize: '12px',
            fontWeight: 'bold',
            borderRadius: 'var(--btn-r)',
            background: activeTab === 'active' ? 'rgba(79, 142, 247, 0.15)' : 'var(--s1)',
            border: activeTab === 'active' ? '1px solid rgba(79, 142, 247, 0.35)' : '1px solid var(--b1)',
            color: activeTab === 'active' ? 'var(--blue)' : 'var(--t2)',
          }}
        >
          ⚡ Aktív munkák
        </div>
        <div 
          onClick={() => {
            setActiveTab('archived');
            setSearchQuery('');
          }} 
          className="cursor-pointer transition-all duration-200"
          style={{
            flex: 1,
            padding: '10px 0',
            textAlign: 'center',
            fontSize: '12px',
            fontWeight: 'bold',
            borderRadius: 'var(--btn-r)',
            background: activeTab === 'archived' ? 'rgba(255, 214, 10, 0.15)' : 'var(--s1)',
            border: activeTab === 'archived' ? '1px solid rgba(255, 214, 10, 0.35)' : '1px solid var(--b1)',
            color: activeTab === 'archived' ? '#ffd60a' : 'var(--t2)',
          }}
        >
          🗂 Archivált / Kész
        </div>
      </div>

      {/* 🔍 MODERNEBB APPLE STÍLUSÚ VALÓS IDEJŰ KERESŐ */}
      <div className="relative fu d2" style={{ marginLeft: '15px', marginRight: '15px', marginBottom: '16px' }}>
        <input 
          type="text" 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Keresés név, utca vagy sorszám alapján..."
          className="w-full font-semibold"
          style={{
            background: 'var(--s1)',
            border: '1px solid var(--b1)',
            borderRadius: '14px',
            padding: '12px 14px 12px 38px',
            fontSize: '13px',
            color: 'var(--t1)',
            outline: 'none',
            transition: 'all 0.15s ease',
            height: '46px'
          }}
        />
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ fontSize: '14px', color: 'var(--t3)' }}>🔍</span>
        {searchQuery && (
          <button 
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full flex items-center justify-center font-bold transition-all"
            style={{ background: 'var(--s2)', color: 'var(--t2)', fontSize: '8px' }}
          >
            ✕
          </button>
        )}
      </div>

      <div className="fu d3" style={{ paddingLeft: '15px', paddingRight: '15px', paddingBottom: '100px' }}>
        {filteredProjects.length === 0 ? (
          <div className="text-center w-full mt-2 py-8" style={{ background: 'var(--s1)', border: '1px solid var(--b1)', borderRadius: 'var(--card-r)', fontSize: '13px', color: 'var(--t3)', fontStyle: 'italic' }}>
            {searchQuery ? 'Nincs a keresésnek megfelelő projekt.' : `Nincsenek ${activeTab === 'active' ? 'aktív' : 'archivált'} projektek.`}
          </div>
        ) : (
          filteredProjects.map(proj => {
            // Dinamikus haladás számítás
            const tasksList = proj.tasks ? proj.tasks.split('\n').map(t => t.trim()).filter(Boolean) : [];
            const totalTasks = tasksList.length;
            const completedCount = proj.completed_tasks ? proj.completed_tasks.length : 0;
            const progress = totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0;
            
            return (
              <div
                key={proj.id}
                className="pc animate-[fadeIn_0.2s_ease-out]"
                style={{
                  width: '100%',
                  marginBottom: '15px',
                  border: proj.archived ? '1px solid rgba(255,255,255,0.05)' : '1px solid var(--b1)',
                  background: proj.archived ? 'var(--s2)' : 'var(--s1)'
                }}
                onClick={() => navigate(`/project/${proj.id}`)}
              >
                <div className="pc-tag" style={{
                  background: proj.archived 
                    ? 'rgba(255,255,255,0.05)' 
                    : (proj.is_solar ? 'rgba(255, 214, 10, 0.12)' : 'rgba(46, 209, 88, 0.14)'),
                  color: proj.archived 
                    ? 'var(--t2)' 
                    : (proj.is_solar ? '#ffd60a' : '#2ed158')
                }}>
                  {proj.archived 
                    ? '🗂 Archivált' 
                    : (proj.is_solar ? '☀️ Napelem' : '⚡ Projekt')} {proj.serial_number ? `· ${proj.serial_number}` : ''}
                </div>
                <div className="pc-name" style={{ color: proj.archived ? 'var(--t2)' : 'var(--t1)' }}>{proj.name}</div>
                <div className="pc-addr">📍 {proj.address}</div>
                <div className="pbar">
                  <div 
                    className="pfill" 
                    style={{
                      width: `${progress}%`,
                      background: proj.archived 
                        ? 'var(--t3)' 
                        : (proj.is_solar ? '#ffd60a' : '#2ed158')
                    }}
                  ></div>
                </div>
                <div className="pc-bot">
                  <span>{progress === 100 ? 'Befejezve ✓' : `${progress}% kész`}</span>
                  <span className={`pill ${proj.archived ? 'p-warn' : 'p-ok'}`}>
                    {proj.archived ? 'Lezárt' : 'Folyamatban'}
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
