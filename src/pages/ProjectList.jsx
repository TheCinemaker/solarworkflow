import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export default function ProjectList() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);

  useEffect(() => {
    async function fetchProjects() {
      const { data } = await supabase.from('projects').select('*').order('created_at', { ascending: false });
      if (data) setProjects(data);
    }
    fetchProjects();

    // REALTIME SUBSCRIBER: Valós idejű frissítés a projektek táblánál
    const channel = supabase
      .channel('projects-list-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, () => { fetchProjects(); })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="page active">
      <div className="back-btn fu" onClick={() => navigate('/')}>‹ Vissza</div>
      <div className="page-header fu">
        <div>
          <div className="pg-title">Összes Projekt</div>
        </div>
      </div>

      <div className="hscroll fu d4" style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
        {projects.length === 0 ? (
          <div className="text-center text-slate-500 text-sm italic w-full mt-4">Nincsenek még projektek.</div>
        ) : (
          projects.map(proj => {
            // Dinamikus haladás számítás
            const tasksList = proj.tasks ? proj.tasks.split('\n').map(t => t.trim()).filter(Boolean) : [];
            const totalTasks = tasksList.length;
            const completedCount = proj.completed_tasks ? proj.completed_tasks.length : 0;
            const progress = totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0;
            
            return (
              <div key={proj.id} className="pc" style={{ minWidth: '100%' }} onClick={() => navigate(`/project/${proj.id}`)}>
                <div className="pc-tag" style={{background:'rgba(46,209,88,.14)',color:'#2ed158'}}>⚡ Projekt {proj.serial_number ? `· ${proj.serial_number}` : ''}</div>
                <div className="pc-name">{proj.name}</div>
                <div className="pc-addr">📍 {proj.address}</div>
                <div className="pbar"><div className="pfill" style={{width:`${progress}%`,background:'#2ed158'}}></div></div>
                <div className="pc-bot"><span>{progress === 100 ? 'Befejezve ✓' : `${progress}% kész`}</span><span className="pill p-ok">Aktív</span></div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
