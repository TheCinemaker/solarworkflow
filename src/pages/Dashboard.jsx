import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useUser } from '../context/UserContext';
import NewWorkerModal from '../components/NewWorkerModal';
import NewProjectModal from '../components/NewProjectModal';
import { Icon } from '../components/Icon';

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useUser();
  const [stats, setStats] = useState({ projects: 0, workers: 0, worklogs: 0, issues: 0, income: 0 });
  const [workerStats, setWorkerStats] = useState({ hours: 0, earnings: 0 });
  const [projects, setProjects] = useState([]);
  const [activities, setActivities] = useState([]);
  const [isWorkerModalOpen, setIsWorkerModalOpen] = useState(false);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);

  const handleLogout = async () => {
    const confirmLogout = window.confirm("Biztosan ki szeretnél jelentkezni?");
    if (confirmLogout) {
      await supabase.auth.signOut();
    }
  };

  useEffect(() => {
    // Kis animációs effekt a folyamatsávokhoz
    const timeout = setTimeout(() => {
      document.querySelectorAll('.pfill').forEach(b => {
        const w = b.style.width;
        b.style.width = '0';
        requestAnimationFrame(() => requestAnimationFrame(() => {
          b.style.width = w;
        }));
      });
    }, 100);

    async function fetchData() {
      if (!user) return;

      // 1. Általános statisztikák
      const { count: projectsCount } = await supabase.from('projects').select('*', { count: 'exact', head: true }).eq('archived', false);
      const { count: workersCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).neq('role', 'admin');
      const { count: worklogsCount } = await supabase.from('worklogs').select('*', { count: 'exact', head: true }).eq('date', new Date().toISOString().split('T')[0]);
      const { count: issuesCount } = await supabase.from('media').select('*', { count: 'exact', head: true }).eq('is_issue', true).eq('resolved', false);
      
      // Valós havi bevétel / szerződéses összeg
      const { data: priceData } = await supabase.from('projects').select('client_price').eq('archived', false);
      const totalIncome = priceData ? priceData.reduce((sum, p) => sum + (p.client_price || 0), 0) : 0;

      setStats({
        projects: projectsCount || 0,
        workers: workersCount || 0,
        worklogs: worklogsCount || 0,
        issues: issuesCount || 0,
        income: totalIncome
      });

      // 2. Munkás specifikus havi óraszám és kifizetés kalkuláció
      if (user.role === 'worker') {
        const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
        const { data: myLogs } = await supabase
          .from('worklogs')
          .select('hours')
          .eq('user_id', user.id)
          .gte('date', startOfMonth);
        
        const myHours = myLogs ? myLogs.reduce((sum, log) => sum + Number(log.hours), 0) : 0;
        const myWage = user.hourly_wage || 3500;
        setWorkerStats({
          hours: parseFloat(myHours.toFixed(2)),
          earnings: myHours * myWage
        });
      }

      // 3. Aktív projektek lekérése
      const { data: projectsData } = await supabase.from('projects').select('*').eq('archived', false).order('created_at', { ascending: false }).limit(5);
      if (projectsData) setProjects(projectsData);

      // 4. Friss aktivitás lekérése
      let activitiesQuery = supabase.from('worklogs')
        .select(`*, profiles(full_name), projects(name)`)
        .order('created_at', { ascending: false });
      
      // Ha munkás a bejelentkezett felhasználó, csak a saját aktivitását mutassuk
      if (user.role === 'worker') {
        activitiesQuery = activitiesQuery.eq('user_id', user.id);
      }
      
      const { data: worklogsData } = await activitiesQuery.limit(5);
      if (worklogsData) setActivities(worklogsData);
    }
    
    fetchData();

    // REALTIME SUBSCRIBER
    const channel = supabase
      .channel('dashboard-realtime-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, () => { fetchData(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => { fetchData(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'worklogs' }, () => { fetchData(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'media' }, () => { fetchData(); })
      .subscribe();

    return () => {
      clearTimeout(timeout);
      supabase.removeChannel(channel);
    };
  }, [isWorkerModalOpen, isProjectModalOpen, user]);

  const isAdmin = user?.role === 'admin';

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 10) return { text: 'Jó reggelt' };
    if (hour >= 10 && hour < 18) return { text: 'Szép napot' };
    if (hour >= 18 && hour < 22) return { text: 'Szép estét' };
    return { text: 'Szép éjszakát' };
  };

  const greeting = getGreeting();
  
  let rawName = user?.full_name || '';
  if (!rawName && user?.email) {
    const emailPrefix = user.email.split('@')[0];
    const parts = emailPrefix.split('.');
    if (parts.length > 1) {
      rawName = parts[1];
    } else {
      rawName = parts[0];
    }
  }
  
  const name = rawName 
    ? rawName.trim().split(' ')[0].charAt(0).toUpperCase() + rawName.trim().split(' ')[0].slice(1)
    : 'Dolgozó';

  const [theme, setTheme] = useState(() => {
    return document.documentElement.getAttribute('data-theme') || 'dark';
  });

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    document.documentElement.setAttribute('data-theme', nextTheme);
    localStorage.setItem('theme', nextTheme);
  };

  return (
    <div className="page active" id="p-home">
      <div className="page-header fu">
        <div>
          <div className="pg-greet">{greeting.text}, {name}!</div>
          <div className="pg-title">{isAdmin ? 'Adminisztráció' : 'VoltDesk dashboard'}</div>
        </div>
        <div className="flex items-center" style={{ gap: '6px' }}>
          <div 
            className="hdr-btn" 
            onClick={toggleTheme} 
            title={theme === 'dark' ? 'Világos mód' : 'Sötét mód'}
            style={{ padding: '0', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', cursor: 'pointer', transition: 'all 0.2s' }}
          >
            <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={15} color="var(--t2)" strokeWidth={2.5} />
          </div>
          <div 
            className="hdr-btn" 
            onClick={() => navigate('/calendar')} 
            title="Naptár"
            style={{ padding: '0', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px' }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--t2)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
          </div>
          
          <div 
            className="hdr-btn" 
            onClick={() => navigate('/info')} 
            title="Rendszerinfó"
            style={{ 
              padding: '0', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              width: '32px', 
              height: '32px',
              border: '1px solid rgba(79, 142, 247, 0.25)', 
              background: 'rgba(79, 142, 247, 0.08)'
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="url(#infoGrad)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ filter: 'drop-shadow(0 0 3px rgba(79, 142, 247, 0.4))' }}>
              <defs>
                <linearGradient id="infoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="var(--blue)" />
                  <stop offset="100%" stopColor="var(--green)" />
                </linearGradient>
              </defs>
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="16" x2="12" y2="12"></line>
              <line x1="12" y1="8" x2="12.01" y2="8"></line>
            </svg>
          </div>

          <div 
            className="hdr-btn" 
            onClick={handleLogout}
            style={{ 
              padding: '0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '32px',
              height: '32px',
              border: '1px solid rgba(255, 59, 48, 0.25)', 
              color: 'var(--red)', 
              background: 'rgba(255, 59, 48, 0.12)' 
            }}
            title="Kijelentkezés"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
          </div>
        </div>
      </div>

      {/* STATISZTIKAI RÁCS (Dinamikusan elkülönítve szerepkör szerint) */}
      <div className="stats-grid fu d2">
        <div className="sc" onClick={() => navigate('/projects')}>
          <div className="sc-lbl">Aktív projektek</div>
          <div className="sc-val" style={{color:'var(--blue)'}}>{stats.projects}</div>
          <div className="sc-sub"><span className="sc-dot"></span>Futó munkák</div>
        </div>

        {isAdmin ? (
          // ADMIN STATISZTIKÁK
          <>
            <div className="sc" onClick={() => navigate('/timesheet')}>
              <div className="sc-lbl">Mai munkalapok</div>
              <div className="sc-val" style={{color:'var(--green)'}}>{stats.worklogs}</div>
              <div className="sc-sub">{stats.workers} dolgozó terepen</div>
            </div>
            <div className="sc cursor-pointer" onClick={() => navigate('/finance')}>
              <div className="sc-lbl">Havi bevétel</div>
              <div className="sc-val" style={{color:'var(--yellow)'}}>{(stats.income || 0).toLocaleString('hu-HU')} Ft</div>
              <div className="sc-sub" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Részletes könyvelés →</div>
            </div>
            <div className="sc" onClick={() => navigate('/issues')}>
              <div className="sc-lbl">Aktív hibák</div>
              <div className="sc-val" style={{color:'var(--red)'}}>{stats.issues}</div>
              <div className="sc-sub">Javításra váró hibák</div>
            </div>
          </>
        ) : (
          // MUNKÁS STATISZTIKÁK
          <>
            <div className="sc" onClick={() => navigate('/timesheet')}>
              <div className="sc-lbl">Ledolgozott idő (Hó)</div>
              <div className="sc-val" style={{color:'var(--green)'}}>{workerStats.hours} óra</div>
              <div className="sc-sub">Aktuális havi összesítés</div>
            </div>
            <div className="sc">
              <div className="sc-lbl">Várható fizetésed</div>
              <div className="sc-val" style={{color:'var(--yellow)'}}>{workerStats.earnings.toLocaleString('hu-HU')} Ft</div>
              <div className="sc-sub">Szerződéses órabéred alapján</div>
            </div>
            <div className="sc cursor-pointer" onClick={() => navigate('/issues')}>
              <div className="sc-lbl">Aktív hibák</div>
              <div className="sc-val" style={{color:'var(--red)'}}>{stats.issues}</div>
              <div className="sc-sub">Javításra váró hibák</div>
            </div>
          </>
        )}
      </div>

      {/* GYORSMŰVELETEK (Csak Adminoknak) */}
      {isAdmin && (
        <div className="fu d3" style={{ paddingLeft: '15px', paddingRight: '15px', marginTop: '14px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <div 
            onClick={() => setIsProjectModalOpen(true)}
            className="cursor-pointer transition-all active:scale-[0.98] hover:scale-[1.01] flex items-center justify-center"
            style={{
              background: 'rgba(79, 142, 247, 0.08)',
              border: '1.5px dashed rgba(79, 142, 247, 0.3)',
              borderRadius: '16px',
              height: '56px',
              color: 'var(--blue)',
              fontWeight: '800',
              fontSize: '13px',
              gap: '6px',
              boxShadow: 'var(--shadow-soft)'
            }}
          >
            <Icon name="plus" size={14} color="var(--blue)" strokeWidth={2.5} /> <span>Új projekt</span>
          </div>
          <div
            onClick={() => setIsWorkerModalOpen(true)}
            className="cursor-pointer transition-all active:scale-[0.98] hover:scale-[1.01] flex items-center justify-center"
            style={{
              background: 'rgba(46, 209, 88, 0.08)',
              border: '1.5px dashed rgba(46, 209, 88, 0.3)',
              borderRadius: '16px',
              height: '56px',
              color: 'var(--green)',
              fontWeight: '800',
              fontSize: '13px',
              gap: '6px',
              boxShadow: 'var(--shadow-soft)'
            }}
          >
            <Icon name="plus" size={14} color="var(--green)" strokeWidth={2.5} /> <span>Új dolgozó</span>
          </div>
        </div>
      )}

      {/* AKTÍV PROJEKTEK SZAKASZ */}
      <div className="shdr fu d4">
        <div className="shdr-t">Projektek</div>
        <div className="shdr-a" onClick={() => navigate('/projects')}>Mind →</div>
      </div>
      
      {/* Eredeti horizontális görgetős elrendezés (ha vissza kellene állítani): <div className="hscroll fu d4"> */}
      <div className="space-y-3 px-[15px] fu d4">
        {projects.length === 0 ? (
          <div className="p-4 text-center w-full" style={{ fontSize: '13px', color: 'var(--t3)', fontStyle: 'italic' }}>Nincsenek még projektek.</div>
        ) : (
          projects.map(proj => {
            const tasksList = proj.tasks ? proj.tasks.split('\n').map(t => t.trim()).filter(Boolean) : [];
            const totalTasks = tasksList.length;
            const completedCount = proj.completed_tasks ? proj.completed_tasks.length : 0;
            const progress = totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0;
            
            return (
              <div key={proj.id} className="pc" onClick={() => navigate(`/project/${proj.id}`)}>
                <div className="pc-tag" style={{
                  background: proj.is_solar ? 'rgba(255, 214, 10, 0.12)' : 'rgba(46, 209, 88, 0.14)',
                  color: proj.is_solar ? 'var(--yellow)' : 'var(--green)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px'
                }}>
                  <Icon name={proj.is_solar ? 'sun' : 'bolt'} size={11} strokeWidth={2.5} />
                  <span>{proj.is_solar ? 'Napelem' : 'Projekt'}{proj.serial_number ? ` · ${proj.serial_number}` : ''}</span>
                </div>
                <div className="pc-name">{proj.name}</div>
                <div className="pc-addr" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <Icon name="pin" size={11} color="var(--t3)" strokeWidth={2} />
                  <span>{proj.address}</span>
                </div>
                <div className="pbar"><div className="pfill" style={{width:`${progress}%`,background: proj.is_solar ? 'var(--yellow)' : 'var(--green)'}}></div></div>
                <div className="pc-bot">
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    {progress === 100 ? (<><span>Befejezve</span><Icon name="check" size={11} color="var(--green)" strokeWidth={3} /></>) : `${progress}% kész`}
                  </span>
                  <span className="pill p-ok">Aktív</span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* FRISS AKTIVITÁS (Dolgozóknak csak a saját órajelentéseik, Adminoknak a teljes csapaté) */}
      <div className="shdr fu d5">
        <div className="shdr-t">{isAdmin ? 'Friss aktivitás (Csapat)' : 'Utolsó időrögzítéseid'}</div>
      </div>
      <div className="act-list fu d5" style={{ paddingBottom: '80px' }}>
        {activities.length === 0 ? (
          <div className="p-4 text-center" style={{ fontSize: '13px', color: 'var(--t3)', fontStyle: 'italic' }}>Nincs még aktivitás rögzítve.</div>
        ) : (
          activities.map(act => (
            <div key={act.id} className="act">
              <div className="act-ico" style={{
                background: isAdmin ? 'rgba(79,142,247,.12)' : 'rgba(46,209,88,.12)',
                color: isAdmin ? 'var(--blue)' : 'var(--green)'
              }}>
                <Icon name="clock" size={16} strokeWidth={2.2} />
              </div>
              <div className="act-body">
                <div className="act-txt">
                  {isAdmin ? (
                    <><b>{act.profiles?.full_name || 'Ismeretlen'}</b> órát rögzített – <i>{act.projects?.name || 'Projekt'}</i></>
                  ) : (
                    <>Rögzítettél <b>{act.hours} órát</b> a(z) <i>{act.projects?.name || 'Projekt'}</i> helyszínen</>
                  )}
                </div>
                <div className="act-time">
                  {act.date} · {new Date(act.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {isAdmin && (
        <>
          <NewWorkerModal 
            isOpen={isWorkerModalOpen} 
            onClose={() => setIsWorkerModalOpen(false)} 
            onSuccess={() => alert('Dolgozó sikeresen létrehozva!')} 
          />

          <NewProjectModal
            isOpen={isProjectModalOpen}
            onClose={() => setIsProjectModalOpen(false)}
            onSuccess={() => alert('Projekt sikeresen létrehozva!')}
          />
        </>
      )}
    </div>
  );
}
