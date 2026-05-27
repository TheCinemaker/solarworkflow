import { useNavigate } from 'react-router-dom';
import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export default function Finance() {
  const navigate = useNavigate();
  const [workersData, setWorkersData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Alapértelmezett rezsi óradíj a fizetések becsléséhez (pl. 3500 Ft/óra)
  const HOURLY_RATE = 3500;

  async function loadFinanceData() {
    try {
      // 1. Profilok (dolgozók) lekérése
      const { data: profiles, error: profErr } = await supabase
        .from('profiles')
        .select('id, full_name, role, serial_number');

      if (profErr) throw profErr;

      // 2. Munkalapok lekérése az összesítéshez
      const { data: logs, error: logsErr } = await supabase
        .from('worklogs')
        .select('user_id, hours');

      if (logsErr) throw logsErr;

      // 3. Adatok összesítése dolgozónként
      if (profiles) {
        const aggregated = profiles.map(profile => {
          // Dolgozó munkalapjai
          const workerLogs = logs ? logs.filter(log => log.user_id === profile.id) : [];
          
          // Összesített óraszám
          const totalHours = workerLogs.reduce((sum, log) => sum + Number(log.hours), 0);
          
          return {
            ...profile,
            totalHours: parseFloat(totalHours.toFixed(2)),
            totalLogs: workerLogs.length,
            estimatedPay: totalHours * HOURLY_RATE
          };
        });

        // Óraszám szerint csökkenőbe rendezzük a listát
        aggregated.sort((a, b) => b.totalHours - a.totalHours);
        setWorkersData(aggregated);
      }
    } catch (err) {
      console.error("Hiba a bérköltségek betöltésekor:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadFinanceData();

    // REALTIME SUBSCRIBER: Valós idejű frissülés ha új munkalap születik
    const channel = supabase
      .channel('finance-realtime-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'worklogs' }, () => {
        loadFinanceData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
        loadFinanceData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Cég szintű összesítések
  const companyTotalHours = workersData.reduce((sum, w) => sum + w.totalHours, 0);
  const companyTotalPay = workersData.reduce((sum, w) => sum + w.estimatedPay, 0);

  if (loading) {
    return (
      <div className="page active flex items-center justify-center h-screen text-slate-400">
        Pénzügyek betöltése...
      </div>
    );
  }

  return (
    <div className="page active scroll-area" id="p-workers">
      <div className="back-btn fu" onClick={() => navigate('/')}>‹ Vissza a Dashboardra</div>
      
      <div className="page-header fu">
        <div>
          <div className="pg-greet">Összesített bérköltségek</div>
          <div className="pg-title">Bér & Óra követés</div>
        </div>
        <div className="hdr-btn">👷</div>
      </div>

      {error && (
        <div className="mx-5 mt-4 p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs">
          {error}
        </div>
      )}

      {/* Cég szintű összesítő panel */}
      <div className="stats-grid fu d1">
        <div className="sc" style={{ background: 'rgba(46, 209, 88, 0.1)' }}>
          <div className="sc-lbl">Összes munkaóra</div>
          <div className="sc-val" style={{ color: 'var(--green)' }}>{companyTotalHours} óra</div>
          <div className="sc-sub">Rögzített órák összesen</div>
        </div>
        <div className="sc" style={{ background: 'rgba(255, 214, 10, 0.1)' }}>
          <div className="sc-lbl">Várható kifizetés</div>
          <div className="sc-val" style={{ color: '#ffd60a' }}>{companyTotalPay.toLocaleString('hu-HU')} Ft</div>
          <div className="sc-sub">{HOURLY_RATE.toLocaleString('hu-HU')} Ft / óra alapon</div>
        </div>
      </div>

      <div className="shdr fu d2">
        <div className="shdr-t">Dolgozói órák és bérek</div>
        <div className="shdr-a">{workersData.length} dolgozó</div>
      </div>

      {/* Dolgozók rácsos elrendezése */}
      <div className="space-y-3 px-5 pb-20 fu d3">
        {workersData.length === 0 ? (
          <div className="text-center text-xs text-slate-400 italic py-8" style={{ background: 'var(--s1)', border: '1px solid var(--b1)', borderRadius: '20px' }}>
            Nincsenek dolgozók a rendszerben.
          </div>
        ) : (
          workersData.map(worker => (
            <div 
              key={worker.id} 
              className="p-4 rounded-2xl flex flex-col space-y-3" 
              style={{ 
                background: 'var(--s1)', 
                border: '1px solid var(--b1)', 
                backdropFilter: 'blur(8px)', 
                WebkitBackdropFilter: 'blur(8px)' 
              }}
            >
              {/* Dolgozó fejléce */}
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-2.5">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-lg" style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                    👷
                  </div>
                  <div>
                    <div className="font-bold text-slate-200 text-sm">{worker.full_name || 'Névtelen Dolgozó'}</div>
                    <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                      {worker.serial_number ? `Sorszám: ${worker.serial_number}` : `Szerepkör: ${worker.role}`}
                    </div>
                  </div>
                </div>
                
                <div className="text-right">
                  <span className={`pill text-[10px] ${worker.role === 'admin' ? 'p-ok' : 'p-warn'}`}>
                    {worker.role === 'admin' ? 'Admin' : 'Szerelő'}
                  </span>
                </div>
              </div>

              {/* Órák és Bér */}
              <div className="grid grid-cols-2 gap-3 pt-2.5 border-t border-white/5 text-xs">
                <div>
                  <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-0.5">Összesen ledolgozott</div>
                  <div className="font-semibold text-slate-200 flex items-baseline space-x-1">
                    <span className="text-base text-blue-400 font-bold">{worker.totalHours}</span>
                    <span>óra ({worker.totalLogs} nap)</span>
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-0.5">Kereset (becsült)</div>
                  <div className="font-semibold text-slate-200 flex items-baseline space-x-1">
                    <span className="text-base text-yellow-400 font-bold">{worker.estimatedPay.toLocaleString('hu-HU')}</span>
                    <span>Ft</span>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
