import { useNavigate } from 'react-router-dom';
import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export default function Issues() {
  const navigate = useNavigate();
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Állapotok a szűréshez és a javítás beküldéshez
  const [activeTab, setActiveTab] = useState('open'); // 'open' vagy 'resolved'
  const [expandedIssueId, setExpandedIssueId] = useState(null); // melyik kártya van nyitva javításra
  const [fixComment, setFixComment] = useState('');
  const [fixFile, setFixFile] = useState(null);
  const [savingFix, setSavingFix] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  async function loadIssues() {
    try {
      // 1. Jelenlegi felhasználó betöltése
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);

      // 2. Minden hiba lekérése (is_issue = true) a projekt és profil adatokkal együtt
      // resolved_by kapcsolatot külön profiles_resolver névvel kérjük be a Supabase-ből a duplikáció elkerülésére
      const { data, error: issuesErr } = await supabase
        .from('media')
        .select(`
          id,
          file_path,
          description,
          is_issue,
          resolved,
          resolved_at,
          resolved_comment,
          resolved_file_path,
          project_id,
          created_at,
          profiles (full_name, serial_number),
          projects (name, serial_number),
          resolved_by_profile:profiles!media_resolved_by_fkey (full_name, serial_number)
        `)
        .eq('is_issue', true)
        .order('created_at', { ascending: false });

      if (issuesErr) throw issuesErr;
      if (data) {
        setIssues(data);
      }
    } catch (err) {
      console.error("Hiba a hibák betöltésekor:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadIssues();

    // REALTIME SUBSCRIBER: Valós idejű frissülés, ha egy hibát beküldenek vagy javítanak
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

  // Javítás mentése
  const handleResolveIssue = async (e, issue) => {
    e.preventDefault();
    if (!fixFile) {
      alert("A javításról készült fotó feltöltése kötelező!");
      return;
    }

    setSavingFix(true);
    setError(null);

    try {
      // 1. Fájl feltöltése a Supabase Storage-ba
      const fileExt = fixFile.name.split('.').pop();
      const fileName = `resolved_${Date.now()}.${fileExt}`;
      const filePath = `${issue.project_id}/${fileName}`;

      const { error: uploadErr } = await supabase.storage
        .from('project-photos')
        .upload(filePath, fixFile);

      if (uploadErr) throw uploadErr;

      // 2. Publikus URL lekérése
      const { data: urlData } = supabase.storage
        .from('project-photos')
        .getPublicUrl(filePath);

      const publicUrl = urlData.publicUrl;

      // 3. Rekord frissítése a media táblában a javítási információkkal
      const { error: updateErr } = await supabase
        .from('media')
        .update({
          resolved: true,
          resolved_at: new Date().toISOString(),
          resolved_by: currentUser?.id,
          resolved_file_path: publicUrl,
          resolved_comment: fixComment || 'Hiba sikeresen javítva.'
        })
        .eq('id', issue.id);

      if (updateErr) throw updateErr;

      // 4. "Megbökjük" a projekt tábla updated_at mezőjét a valós idejű frissülésért
      await supabase
        .from('projects')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', issue.project_id);

      // Siker!
      setFixComment('');
      setFixFile(null);
      setExpandedIssueId(null);
      await loadIssues();
      alert("Javítás sikeresen rögzítve! Köszönjük a munkádat! 👍");
    } catch (err) {
      console.error("Hiba a javítás mentésekor:", err);
      setError("Hiba történt: " + err.message);
    } finally {
      setSavingFix(false);
    }
  };

  // Kiszűrjük a nyitott és a javított hibákat
  const openIssues = issues.filter(i => !i.resolved);
  const resolvedIssues = issues.filter(i => i.resolved);
  const displayedIssues = activeTab === 'open' ? openIssues : resolvedIssues;

  if (loading) {
    return (
      <div className="page active flex items-center justify-center h-screen text-slate-400">
        Hibajegyek betöltése...
      </div>
    );
  }

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
    <div className="page active scroll-area" id="p-issues">
      <div className="back-btn fu" onClick={() => navigate('/')}>‹ Vissza a Dashboardra</div>
      
      <div className="page-header fu">
        <div>
          <div className="pg-greet">Központi hibajegy követés</div>
          <div className="pg-title">Hibák / Visszajárás</div>
        </div>
        <div className="hdr-btn" style={{ background: 'rgba(255, 59, 48, 0.15)', color: 'var(--red)', border: '1px solid rgba(255, 59, 48, 0.25)' }}>⚠️</div>
      </div>

      {error && (
        <div className="mx-5 mt-4 p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs">
          {error}
        </div>
      )}

      {/* FÜLEK (Nyitott / Javított szűrő) */}
      <div className="mx-5 my-3 p-1 rounded-xl flex items-center" style={{ background: 'var(--s1)', border: '1px solid var(--b1)' }}>
        <div 
          onClick={() => { setActiveTab('open'); setExpandedIssueId(null); }} 
          style={tabStyle('open')}
        >
          🔴 Nyitott hibák ({openIssues.length})
        </div>
        <div 
          onClick={() => { setActiveTab('resolved'); setExpandedIssueId(null); }} 
          style={tabStyle('resolved')}
        >
          🟢 Javított ({resolvedIssues.length})
        </div>
      </div>

      <div className="shdr fu d1">
        <div className="shdr-t">{activeTab === 'open' ? 'Elhárításra váró akadályok' : 'Sikeresen lezárt hibajegyek'}</div>
        <div className="shdr-a">{displayedIssues.length} db</div>
      </div>

      {/* Hibák listája */}
      <div className="space-y-4 px-5 pb-20 fu d2">
        {displayedIssues.length === 0 ? (
          <div className="text-center text-xs text-slate-400 italic py-10" style={{ background: 'var(--s1)', border: '1px solid var(--b1)', borderRadius: '20px' }}>
            Nincsenek {activeTab === 'open' ? 'aktív hibák' : 'javított hibajegyek'} a rendszerben.
          </div>
        ) : (
          displayedIssues.map(issue => {
            const formattedDate = new Date(issue.created_at).toLocaleDateString('hu-HU', {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            });

            return (
              <div 
                key={issue.id} 
                className="p-3.5 rounded-2xl flex flex-col space-y-3 relative"
                style={{ 
                  background: 'var(--s1)', 
                  border: issue.resolved ? '1px solid rgba(46, 209, 88, 0.3)' : '1px solid rgba(255, 59, 48, 0.3)', 
                  backdropFilter: 'blur(8px)', 
                  WebkitBackdropFilter: 'blur(8px)' 
                }}
              >
                {/* 1. Projekt Fejléc */}
                <div className="flex justify-between items-start cursor-pointer" onClick={() => navigate(`/project/${issue.project_id}`)}>
                  <div>
                    <span className="pc-tag text-[9px] px-2 py-0.5 rounded-full" style={{ 
                      background: issue.resolved ? 'rgba(46, 209, 88, 0.15)' : 'rgba(255, 59, 48, 0.15)', 
                      color: issue.resolved ? 'var(--green)' : 'var(--red)', 
                      border: issue.resolved ? '1px solid rgba(46, 209, 88, 0.25)' : '1px solid rgba(255, 59, 48, 0.25)' 
                    }}>
                      ⚡ {issue.projects?.serial_number || 'Projekt'}
                    </span>
                    <h3 className="font-bold text-slate-100 text-sm mt-1">{issue.projects?.name || 'Névtelen Projekt'}</h3>
                  </div>
                  <div className="text-right text-[10px] text-slate-400">
                    {formattedDate}
                  </div>
                </div>

                {/* 2. NYITOTT HIBA NÉZET */}
                {!issue.resolved && (
                  <>
                    <div className="flex space-x-3 items-start pt-2 border-t border-white/5">
                      {issue.file_path && (
                        <a 
                          href={issue.file_path} 
                          target="_blank" 
                          rel="noreferrer"
                          className="w-20 h-20 rounded-xl flex-shrink-0 block"
                          style={{
                            backgroundImage: `url(${issue.file_path})`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                            border: '1px solid var(--b1)'
                          }}
                        />
                      )}
                      <div className="flex-1">
                        <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Eredeti Probléma</div>
                        <div className="text-xs text-red-300 font-medium leading-snug italic bg-red-500/5 p-2.5 rounded-lg border border-red-500/10">
                          ⚠️ {issue.description || 'Hiba leírás nélkül feltöltve.'}
                        </div>
                      </div>
                    </div>

                    {/* Lábjegyzet és Javítás rögzítése gomb */}
                    <div className="flex justify-between items-center pt-2.5 border-t border-white/5 text-[10px] text-slate-400">
                      <span>Bejelentette: <b>👷 {issue.profiles?.full_name || 'Szerelő'}</b></span>
                      
                      <button 
                        onClick={() => setExpandedIssueId(expandedIssueId === issue.id ? null : issue.id)}
                        className="px-2.5 py-1.5 rounded-lg font-bold text-[10px] transition-all"
                        style={{
                          background: 'linear-gradient(135deg, #ffd60a, #ccab00)',
                          border: 'none',
                          color: '#000',
                          boxShadow: '0 4px 12px rgba(255, 214, 10, 0.2)'
                        }}
                      >
                        {expandedIssueId === issue.id ? 'Mégsem' : '🔧 Javítás rögzítése'}
                      </button>
                    </div>

                    {/* JAVÍTÁS RÖGZÍTÉSE LENYÍLÓ PANEL */}
                    {expandedIssueId === issue.id && (
                      <div className="mt-3 p-3 rounded-xl space-y-3 border border-white/5" style={{ background: 'rgba(255,255,255,0.02)' }}>
                        <div className="text-xs font-bold text-amber-300 flex items-center space-x-1">
                          <span>🔧</span>
                          <span>Hiba elhárításának rögzítése</span>
                        </div>

                        <form onSubmit={(e) => handleResolveIssue(e, issue)} className="space-y-3">
                          {/* Fotó feltöltés (KÖTELEZŐ) */}
                          <div>
                            <label className="text-[9px] text-slate-400 uppercase font-bold tracking-wider mb-1 block">Fénykép a javításról (KÖTELEZŐ)</label>
                            <input 
                              type="file" 
                              accept="image/*"
                              onChange={(e) => setFixFile(e.target.files?.[0] || null)}
                              required
                              className="w-full text-xs text-slate-400 file:mr-2 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-[10px] file:font-bold file:bg-blue-500/10 file:text-blue-400 file:cursor-pointer hover:file:bg-blue-500/20"
                            />
                          </div>

                          {/* Megjegyzés */}
                          <div>
                            <label className="text-[9px] text-slate-400 uppercase font-bold tracking-wider mb-1 block">Rövid leírás a javításról (Opcionális)</label>
                            <input 
                              type="text" 
                              value={fixComment}
                              onChange={(e) => setFixComment(e.target.value)}
                              placeholder="pl. Kicseréltem a kábelt, most már szuperál..."
                              className="w-full text-xs"
                              style={{
                                background: 'var(--s1)',
                                border: '1px solid var(--b1)',
                                borderRadius: '8px',
                                padding: '6px 10px',
                                color: 'var(--t1)',
                                outline: 'none'
                              }}
                            />
                          </div>

                          <button 
                            type="submit" 
                            disabled={savingFix}
                            className="w-full py-2 font-bold text-xs rounded-lg transition-all"
                            style={{
                              background: 'linear-gradient(135deg, #2ed158, #1ca542)',
                              border: 'none',
                              color: '#fff',
                              boxShadow: '0 6px 15px rgba(46, 209, 88, 0.25)'
                            }}
                          >
                            {savingFix ? 'Mentés folyamatban...' : 'Javítás Mentése és Lezárás'}
                          </button>
                        </form>
                      </div>
                    )}
                  </>
                )}

                {/* 3. JAVÍTOTT HIBA NÉZET (BEFORE / AFTER ELRENDEZÉS) */}
                {issue.resolved && (
                  <>
                    {/* Before/After rács */}
                    <div className="grid grid-cols-2 gap-3 pt-2.5 border-t border-white/5">
                      {/* BAL: BEFORE (Hiba) */}
                      <div className="flex flex-col space-y-1.5">
                        <div className="text-[9px] text-red-400 font-extrabold uppercase tracking-wider">🔴 Eredeti hiba</div>
                        <a 
                          href={issue.file_path} 
                          target="_blank" 
                          rel="noreferrer"
                          className="aspect-video w-full rounded-lg block relative"
                          style={{
                            backgroundImage: `url(${issue.file_path})`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                            border: '1px solid rgba(255, 59, 48, 0.2)',
                            aspectRatio: '4 / 3'
                          }}
                        />
                        <div className="text-[10px] text-slate-300 italic leading-tight p-1.5 rounded bg-white/5 border border-white/5">
                          {issue.description || 'Nem volt leírás.'}
                        </div>
                      </div>

                      {/* JOBB: AFTER (Javítás) */}
                      <div className="flex flex-col space-y-1.5">
                        <div className="text-[9px] text-green-400 font-extrabold uppercase tracking-wider">🟢 Elvégzett javítás</div>
                        <a 
                          href={issue.resolved_file_path} 
                          target="_blank" 
                          rel="noreferrer"
                          className="aspect-video w-full rounded-lg block relative"
                          style={{
                            backgroundImage: `url(${issue.resolved_file_path})`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                            border: '1px solid rgba(46, 209, 88, 0.2)',
                            aspectRatio: '4 / 3'
                          }}
                        />
                        <div className="text-[10px] text-emerald-300 italic leading-tight p-1.5 rounded border" style={{ background: 'rgba(46, 209, 88, 0.05)', borderColor: 'rgba(46, 209, 88, 0.1)' }}>
                          {issue.resolved_comment || 'Javítva.'}
                        </div>
                      </div>
                    </div>

                    {/* Lábjegyzet: Ki és mikor javította */}
                    <div className="flex justify-between items-center pt-2.5 border-t border-white/5 text-[9px] text-slate-400">
                      <span>Jelentette: <b>{issue.profiles?.full_name || 'Ismeretlen'}</b></span>
                      <span className="text-green-400 font-semibold flex items-center space-x-1">
                        <span>✅ Javította: <b>{issue.resolved_by_profile?.full_name || 'Szerelő'}</b></span>
                      </span>
                    </div>
                  </>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
