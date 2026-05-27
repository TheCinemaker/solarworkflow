import { useNavigate } from 'react-router-dom';
import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export default function Issues() {
  const navigate = useNavigate();
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  async function loadIssues() {
    try {
      // Lekérünk minden olyan médiát, amihez van csatolva szöveges leírás (ezek a helyszíni megjegyzések/hibák)
      const { data, error: issuesErr } = await supabase
        .from('media')
        .select(`
          id,
          file_path,
          description,
          created_at,
          project_id,
          profiles (full_name, serial_number),
          projects (name, serial_number)
        `)
        .neq('description', '')
        .order('created_at', { ascending: false });

      if (issuesErr) throw issuesErr;
      if (data) {
        setIssues(data);
      }
    } catch (err) {
      console.error("Hiba a hibajegyek betöltésekor:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadIssues();

    // REALTIME SUBSCRIBER: Valós idejű frissülés, ha új hibát/képet töltenek fel
    const channel = supabase
      .channel('issues-realtime-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'media' }, () => {
        loadIssues();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (loading) {
    return (
      <div className="page active flex items-center justify-center h-screen text-slate-400">
        Hibajegyek betöltése...
      </div>
    );
  }

  return (
    <div className="page active scroll-area" id="p-issues">
      <div className="back-btn fu" onClick={() => navigate('/')}>‹ Vissza a Dashboardra</div>
      
      <div className="page-header fu">
        <div>
          <div className="pg-greet">Központi helyszíni napló</div>
          <div className="pg-title">Hibák / Visszajárás</div>
        </div>
        <div className="hdr-btn" style={{ background: 'rgba(255, 59, 48, 0.15)', color: 'var(--red)', border: '1px solid rgba(255, 59, 48, 0.25)' }}>⚠️</div>
      </div>

      {error && (
        <div className="mx-5 mt-4 p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs">
          {error}
        </div>
      )}

      {/* Magyarázó kártya */}
      <div className="gcard fu d1 flex items-start space-x-3 mb-2" style={{ background: 'rgba(79, 142, 247, 0.05)', border: '1px solid rgba(79, 142, 247, 0.15)' }}>
        <span className="text-xl">📢</span>
        <div className="text-xs text-slate-300 leading-relaxed">
          Ez a központi csatorna a terepen rögzített **helyszíni megjegyzéseket és hiba jelentéseket** összesíti. Bármelyik szerelő fotóz le egy problémát vagy ír bejegyzést a helyszínen, az itt azonnal, valós időben megjelenik!
        </div>
      </div>

      <div className="shdr fu d2">
        <div className="shdr-t">Helyszíni megjegyzések és blokkolók</div>
        <div className="shdr-a">{issues.length} db</div>
      </div>

      {/* Hibák idővonala */}
      <div className="space-y-4 px-5 pb-20 fu d3">
        {issues.length === 0 ? (
          <div className="text-center text-xs text-slate-400 italic py-10" style={{ background: 'var(--s1)', border: '1px solid var(--b1)', borderRadius: '20px' }}>
            Nincsenek aktív visszajelzések vagy hibák a rendszerben.
          </div>
        ) : (
          issues.map(issue => {
            const formattedDate = new Date(issue.created_at).toLocaleDateString('hu-HU', {
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            });

            return (
              <div 
                key={issue.id} 
                className="p-3.5 rounded-2xl flex flex-col space-y-3 cursor-pointer hover:scale-[1.01] transition-all"
                style={{ 
                  background: 'var(--s1)', 
                  border: '1px solid var(--b1)', 
                  backdropFilter: 'blur(8px)', 
                  WebkitBackdropFilter: 'blur(8px)' 
                }}
                onClick={() => navigate(`/project/${issue.project_id}`)}
              >
                {/* Projekt és sorszám */}
                <div className="flex justify-between items-start">
                  <div>
                    <span className="pc-tag text-[9px] px-2 py-0.5 rounded-full" style={{ background: 'rgba(255, 159, 10, 0.15)', color: 'var(--orange)', border: '1px solid rgba(255, 159, 10, 0.25)' }}>
                      ⚡ {issue.projects?.serial_number || 'Projekt'}
                    </span>
                    <h3 className="font-bold text-slate-100 text-sm mt-1">{issue.projects?.name || 'Névtelen Projekt'}</h3>
                  </div>
                  <div className="text-right text-[10px] text-slate-400">
                    {formattedDate}
                  </div>
                </div>

                {/* Hiba leírása és a fotó */}
                <div className="flex space-x-3 items-center pt-2 border-t border-white/5">
                  {issue.file_path && (
                    <div 
                      className="w-16 h-16 rounded-xl flex-shrink-0"
                      style={{
                        backgroundImage: `url(${issue.file_path})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        border: '1px solid var(--b1)'
                      }}
                    />
                  )}
                  <div className="flex-1">
                    <div className="text-xs text-amber-200 font-semibold leading-snug italic bg-amber-500/5 p-2 rounded-lg border border-amber-500/10">
                      ⚠️ {issue.description}
                    </div>
                  </div>
                </div>

                {/* Feltöltő szerelő adatai */}
                <div className="flex justify-between items-center pt-2 border-t border-white/5 text-[10px] text-slate-400">
                  <span>Bejelentette: <b>👷 {issue.profiles?.full_name || 'Szerelő'}</b></span>
                  <span className="text-blue-400 font-bold hover:underline">Projekt részletei →</span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
