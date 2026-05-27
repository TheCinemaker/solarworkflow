import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import NewWorkerModal from '../components/NewWorkerModal';
import NewProjectModal from '../components/NewProjectModal';

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ projects: 0, workers: 0, worklogs: 0 });
  const [isWorkerModalOpen, setIsWorkerModalOpen] = useState(false);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);

  useEffect(() => {
    // Small animation effect for progress bars
    const timeout = setTimeout(() => {
      document.querySelectorAll('.pfill').forEach(b => {
        const w = b.style.width;
        b.style.width = '0';
        requestAnimationFrame(() => requestAnimationFrame(() => {
          b.style.width = w;
        }));
      });
    }, 100);

    async function fetchStats() {
      const { count: projectsCount } = await supabase.from('projects').select('*', { count: 'exact', head: true });
      const { count: workersCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
      const { count: worklogsCount } = await supabase.from('worklogs').select('*', { count: 'exact', head: true }).eq('date', new Date().toISOString().split('T')[0]);
      
      setStats({
        projects: projectsCount || 0,
        workers: workersCount || 0,
        worklogs: worklogsCount || 0
      });
    }
    fetchStats();

    return () => clearTimeout(timeout);
  }, [isWorkerModalOpen, isProjectModalOpen]);

  return (
    <div className="page active" id="p-home">
      <div className="page-header fu">
        <div>
          <div className="pg-greet">Jó reggelt 👋</div>
          <div className="pg-title">Áttekintés</div>
        </div>
        <div className="hdr-btn">🔔</div>
      </div>

      <div className="alert-strip fu d1" onClick={() => navigate('/issues')}>
        <div className="as-dot"></div>
        <div className="as-txt"><b>3 nyitott hiba</b> – Nagy villa, Horváth porta</div>
        <div className="as-arr">›</div>
      </div>

      <div className="stats-grid fu d2">
        <div className="sc" onClick={() => navigate('/project/1')}>
          <div className="sc-lbl">Aktív projektek</div>
          <div className="sc-val" style={{color:'#4f8ef7'}}>{stats.projects}</div>
          <div className="sc-sub"><span className="sc-dot"></span>Összes db</div>
        </div>
        <div className="sc" onClick={() => navigate('/finance')}>
          <div className="sc-lbl">Mai munkalapok</div>
          <div className="sc-val" style={{color:'#2ed158'}}>{stats.worklogs}</div>
          <div className="sc-sub">{stats.workers} munkás terepen</div>
        </div>
        <div className="sc">
          <div className="sc-lbl">Havi bevétel</div>
          <div className="sc-val" style={{color:'#ffd60a'}}>2.4M</div>
          <div className="sc-sub">Ft · számlázott</div>
        </div>
        <div className="sc" onClick={() => navigate('/issues')}>
          <div className="sc-lbl">Nyitott hibák</div>
          <div className="sc-val" style={{color:'#ff3b30'}}>3</div>
          <div className="sc-sub">2 visszajárás</div>
        </div>
      </div>

      <div className="shdr fu d3">
        <div className="shdr-t">Gyors műveletek</div>
      </div>
      <div className="qa-row fu d3">
        <div className="qa" onClick={() => navigate('/timesheet')}>
          <span className="qa-i">📋</span><div className="qa-l">Napi lap</div>
        </div>
        <div className="qa" onClick={() => navigate('/project/1')}>
          <span className="qa-i">📷</span><div className="qa-l">Fotó küld.</div>
        </div>
        <div className="qa" onClick={() => setIsProjectModalOpen(true)}>
          <span className="qa-i">➕</span><div className="qa-l">Új Projekt</div>
        </div>
        <div className="qa" onClick={() => setIsWorkerModalOpen(true)}>
          <span className="qa-i">👷</span><div className="qa-l">Új Dolgozó</div>
        </div>
      </div>

      <div className="shdr fu d4">
        <div className="shdr-t">Projektek</div>
        <div className="shdr-a" onClick={() => navigate('/project/1')}>Mind →</div>
      </div>
      
      <div className="hscroll fu d4">
        <div className="pc" onClick={() => navigate('/project/1')}>
          <div className="pc-tag" style={{background:'rgba(46,209,88,.14)',color:'#2ed158'}}>☀️ Napelemes</div>
          <div className="pc-name">Molnár ház – 10kWp</div>
          <div className="pc-addr">📍 Pécs, Alkotmány u. 14</div>
          <div className="pbar"><div className="pfill" style={{width:'68%',background:'#2ed158'}}></div></div>
          <div className="pc-bot"><span>68% kész</span><span className="pill p-ok">Aktív</span></div>
        </div>
        <div className="pc" onClick={() => navigate('/project/2')}>
          <div className="pc-tag" style={{background:'rgba(79,142,247,.14)',color:'#4f8ef7'}}>⚡ Villamos</div>
          <div className="pc-name">Irodaház fővezeték</div>
          <div className="pc-addr">📍 Budapest, XIII. ker.</div>
          <div className="pbar"><div className="pfill" style={{width:'22%',background:'#4f8ef7'}}></div></div>
          <div className="pc-bot"><span>22% kész</span><span className="pill p-ok">Aktív</span></div>
        </div>
        <div className="pc" onClick={() => navigate('/project/3')}>
          <div className="pc-tag" style={{background:'rgba(255,159,10,.14)',color:'#ff9f0a'}}>⚡ Villamos</div>
          <div className="pc-name">Horváth porta bekötés</div>
          <div className="pc-addr">📍 Győr, Rét u. 3</div>
          <div className="pbar"><div className="pfill" style={{width:'45%',background:'#ff9f0a'}}></div></div>
          <div className="pc-bot"><span>Anyagra vár</span><span className="pill p-wait">Várakozás</span></div>
        </div>
        <div className="pc" onClick={() => navigate('/project/4')}>
          <div className="pc-tag" style={{background:'rgba(255,59,48,.14)',color:'#ff3b30'}}>☀️ Napelemes</div>
          <div className="pc-name">Nagy villa 6kWp + tároló</div>
          <div className="pc-addr">📍 Debrecen</div>
          <div className="pbar"><div className="pfill" style={{width:'80%',background:'#ff3b30'}}></div></div>
          <div className="pc-bot"><span>Inverter hiba</span><span className="pill p-err">Hiba</span></div>
        </div>
      </div>

      <div className="shdr fu d5">
        <div className="shdr-t">Mai aktivitás</div>
      </div>
      <div className="act-list fu d5">
        <div class="act">
          <div class="act-ico" style={{background:'rgba(46,209,88,.12)'}}>📷</div>
          <div class="act-body">
            <div class="act-txt"><b>Tóth Péter</b> checkpoint fotót küldött – Molnár ház</div>
            <div class="act-time">08:42</div>
          </div>
        </div>
        <div class="act">
          <div class="act-ico" style={{background:'rgba(79,142,247,.12)'}}>⏱</div>
          <div class="act-body">
            <div class="act-txt"><b>Varga Gábor</b> 8 órát rögzített – Irodaház</div>
            <div class="act-time">08:05</div>
          </div>
        </div>
        <div class="act">
          <div class="act-ico" style={{background:'rgba(255,59,48,.12)'}}>⚠️</div>
          <div class="act-body">
            <div class="act-txt"><b>Nagy villa</b> – inverter meghibásodás jelentve</div>
            <div class="act-time">Tegnap 17:23</div>
          </div>
        </div>
        <div className="act">
          <div className="act-ico" style={{background:'rgba(255,159,10,.12)'}}>🚚</div>
          <div className="act-body">
            <div className="act-txt"><b>Horváth porta</b> – anyagszállítás késik 2 napot</div>
            <div className="act-time">Tegnap 15:10</div>
          </div>
        </div>
      </div>

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
    </div>
  );
}
