import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useUser } from '../context/UserContext';
import NewWorkerModal from '../components/NewWorkerModal';
import NewProjectModal from '../components/NewProjectModal';

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
      const { count: workersCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
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

  return (
    <div className="page active" id="p-home">
      <div className="page-header fu">
        <div>
          <div className="pg-greet">Szia {user?.full_name?.split(' ')[0] || 'Dolgozó'}! 👋</div>
          <div className="pg-title">{isAdmin ? 'Adminisztráció' : 'Saját Fiók'}</div>
        </div>
        <div className="flex items-center space-x-2">
          <div className="hdr-btn" onClick={() => navigate('/calendar')} title="Naptár">📅</div>
          <div 
            className="hdr-btn" 
            onClick={handleLogout}
            style={{ 
              border: '1px solid rgba(255, 59, 48, 0.25)', 
              color: 'var(--red)', 
              background: 'rgba(255, 59, 48, 0.12)' 
            }}
            title="Kijelentkezés"
          >
            🚪
          </div>
        </div>
      </div>

      {/* STATISZTIKAI RÁCS (Dinamikusan elkülönítve szerepkör szerint) */}
      <div className="stats-grid fu d2">
        <div className="sc" onClick={() => navigate('/projects')}>
          <div className="sc-lbl">Aktív projektek</div>
          <div className="sc-val" style={{color:'#4f8ef7'}}>{stats.projects}</div>
          <div className="sc-sub"><span className="sc-dot"></span>Futó munkák</div>
        </div>

        {isAdmin ? (
          // ADMIN STATISZTIKÁK
          <>
            <div className="sc" onClick={() => navigate('/timesheet')}>
              <div className="sc-lbl">Mai munkalapok</div>
              <div className="sc-val" style={{color:'#2ed158'}}>{stats.worklogs}</div>
              <div className="sc-sub">{stats.workers} munkás terepen</div>
            </div>
            <div className="sc cursor-pointer" onClick={() => navigate('/finance')}>
              <div className="sc-lbl">Havi bevétel</div>
              <div className="sc-val" style={{color:'#ffd60a'}}>{(stats.income || 0).toLocaleString('hu-HU')} Ft</div>
              <div className="sc-sub">Részletes könyvelés →</div>
            </div>
            <div className="sc" onClick={() => navigate('/issues')}>
              <div className="sc-lbl">Nyitott hibák</div>
              <div className="sc-val" style={{color:'#ff3b30'}}>{stats.issues}</div>
              <div className="sc-sub">⚠️ Aktív akadályok</div>
            </div>
          </>
        ) : (
          // MUNKÁS STATISZTIKÁK
          <>
            <div className="sc" onClick={() => navigate('/timesheet')}>
              <div className="sc-lbl">Ledolgozott idő (Hó)</div>
              <div className="sc-val" style={{color:'#2ed158'}}>{workerStats.hours} óra</div>
              <div className="sc-sub">Aktuális havi összesítés</div>
            </div>
            <div className="sc">
              <div className="sc-lbl">Várható fizetésed</div>
              <div className="sc-val" style={{color:'#ffd60a'}}>{workerStats.earnings.toLocaleString('hu-HU')} Ft</div>
              <div className="sc-sub">Szerződéses órabéred alapján</div>
            </div>
          </>
        )}
      </div>

      {/* GYORS MŰVELETEK (Szerepkör alapú gomb elrejtéssel) */}
      <div className="shdr fu d3">
        <div className="shdr-t">Gyors műveletek</div>
      </div>
      <div className="qa-row fu d3">
        <div className="qa" onClick={() => navigate('/timesheet')}>
          <span className="qa-i">📋</span><div className="qa-l">Napi lap</div>
        </div>
        <div className="qa" onClick={() => navigate('/calendar')}>
          <span className="qa-i">📅</span><div className="qa-l">Naptár</div>
        </div>
        <div className="qa" onClick={() => navigate('/projects')}>
          <span className="qa-i">📷</span><div className="qa-l">Fotó küld.</div>
        </div>
        {isAdmin && (
          <>
            <div className="qa" onClick={() => setIsProjectModalOpen(true)}>
              <span className="qa-i">➕</span><div className="qa-l">Új Projekt</div>
            </div>
            <div className="qa" onClick={() => setIsWorkerModalOpen(true)}>
              <span className="qa-i">👷</span><div className="qa-l">Új Dolgozó</div>
            </div>
          </>
        )}
      </div>

      {/* AKTÍV PROJEKTEK SZAKASZ */}
      <div className="shdr fu d4">
        <div className="shdr-t">Projektek</div>
        <div className="shdr-a" onClick={() => navigate('/projects')}>Mind →</div>
      </div>
      
      <div className="hscroll fu d4">
        {projects.length === 0 ? (
          <div className="p-4 text-center text-slate-500 text-sm italic w-full">Nincsenek még projektek.</div>
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
                  color: proj.is_solar ? '#ffd60a' : '#2ed158'
                }}>
                  {proj.is_solar ? '☀️ Napelem' : '⚡ Projekt'} {proj.serial_number ? `· ${proj.serial_number}` : ''}
                </div>
                <div className="pc-name">{proj.name}</div>
                <div className="pc-addr">📍 {proj.address}</div>
                <div className="pbar"><div className="pfill" style={{width:`${progress}%`,background: proj.is_solar ? '#ffd60a' : '#2ed158'}}></div></div>
                <div className="pc-bot"><span>{progress === 100 ? 'Befejezve ✓' : `${progress}% kész`}</span><span className="pill p-ok">Aktív</span></div>
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
          <div className="p-4 text-center text-slate-500 text-sm italic">Nincs még aktivitás rögzítve.</div>
        ) : (
          activities.map(act => (
            <div key={act.id} className="act">
              <div className="act-ico" style={{
                background: isAdmin ? 'rgba(79,142,247,.12)' : 'rgba(46,209,88,.12)',
                color: isAdmin ? '#4f8ef7' : '#2ed158'
              }}>
                ⏱
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
