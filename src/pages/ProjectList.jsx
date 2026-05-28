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

  const tabStyle = (tabName) => ({
    flex: 1,
    padding: '8px 0',
    textAlign: 'center',
    fontSize: '12px',
    fontWeight: 'bold',
    borderRadius: '10px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    background: activeTab === tabName ? 'var(--s2)' : 'transparent',
    border: activeTab === tabName ? '1px solid var(--b1)' : '1px solid transparent',
    color: activeTab === tabName ? 'var(--t1)' : 'var(--t2)'
  });

  return (
    <div className="page active scroll-area">
      <div className="back-btn fu" onClick={() => navigate('/')}>‹ Vissza a Dashboardra</div>
      
      <div className="page-header fu">
        <div>
          <div className="pg-title">Projektek listája</div>
        </div>
      </div>

      {/* TABS (Aktív / Archivált szűrő) */}
      <div className="mx-5 mb-3 p-1 rounded-xl flex items-center" style={{ background: 'var(--s1)', border: '1px solid var(--b1)' }}>
        <div 
          onClick={() => {
            setActiveTab('active');
            setSearchQuery('');
          }} 
          style={tabStyle('active')}
        >
          ⚡ Aktív munkák
        </div>
        <div 
          onClick={() => {
            setActiveTab('archived');
            setSearchQuery('');
          }} 
          style={tabStyle('archived')}
        >
          🗂 Archivált / Kész
        </div>
      </div>

      {/* 🔍 MODERNEBB APPLE STÍLUSÚ VALÓS IDEJŰ KERESŐ */}
      <div className="mx-5 mb-4 relative fu d2">
        <input 
          type="text" 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Keresés név, utca vagy sorszám alapján..."
          className="w-full text-xs font-semibold"
          style={{
            background: 'var(--s1)',
            border: '1px solid var(--b1)',
            borderRadius: '12px',
            padding: '10px 14px 10px 36px',
            color: 'var(--t1)',
            outline: 'none',
            transition: 'all 0.15s ease'
          }}
        />
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ fontSize: '13px', color: 'var(--t3)' }}>🔍</span>
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

      <div className="hscroll fu d3" style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: '15px', paddingBottom: '100px' }}>
        {filteredProjects.length === 0 ? (
          <div className="text-center w-full mt-2 py-8" style={{ background: 'var(--s1)', border: '1px solid var(--b1)', borderRadius: '16px', fontSize: '13px', color: 'var(--t3)', fontStyle: 'italic' }}>
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
                  minWidth: '100%',
                  border: proj.archived ? '1px solid rgba(255,255,255,0.05)' : '1px solid var(--b1)',
                  background: proj.archived ? 'rgba(7, 9, 15, 0.4)' : 'var(--s1)'
                }} 
                onClick={() => navigate(`/project/${proj.id}`)}
              >
                <div className="pc-tag" style={{
                  background: proj.archived ? 'rgba(255,255,255,0.05)' : 'rgba(46,209,88,.14)',
                  color: proj.archived ? 'var(--t2)' : '#2ed158'
                }}>
                  {proj.archived ? '🗂 Archivált' : '⚡ Aktív'} {proj.serial_number ? `· ${proj.serial_number}` : ''}
                </div>
                <div className="pc-name" style={{ color: proj.archived ? 'var(--t2)' : 'var(--t1)' }}>{proj.name}</div>
                <div className="pc-addr">📍 {proj.address}</div>
                <div className="pbar"><div className="pfill" style={{width:`${progress}%`,background: proj.archived ? 'var(--t3)' : '#2ed158'}}></div></div>
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
