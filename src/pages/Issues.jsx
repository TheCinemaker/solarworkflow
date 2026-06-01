import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Icon } from '../components/Icon';

export default function Issues() {
  const navigate = useNavigate();
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('open');
  const [expandedIssueId, setExpandedIssueId] = useState(null);
  const [fixComment, setFixComment] = useState('');
  const [fixFile, setFixFile] = useState(null);
  const [savingFix, setSavingFix] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  async function loadIssues() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);

      const { data, error: issuesErr } = await supabase
        .from('media')
        .select(`
          id, file_path, description, is_issue, resolved, resolved_at,
          resolved_comment, resolved_file_path, project_id, created_at,
          profiles:profiles!user_id (full_name, serial_number),
          projects (name, serial_number),
          resolved_by_profile:profiles!media_resolved_by_fkey (full_name, serial_number)
        `)
        .eq('is_issue', true)
        .order('created_at', { ascending: false });

      if (issuesErr) throw issuesErr;
      if (data) setIssues(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadIssues();
    const channel = supabase
      .channel('issues-realtime-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'media' }, () => loadIssues())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleResolveIssue = async (e, issue) => {
    e.preventDefault();
    if (!fixFile) { alert("A javításról készült fotó feltöltése kötelező!"); return; }
    setSavingFix(true);
    setError(null);
    try {
      const fileExt = fixFile.name.split('.').pop();
      const filePath = `${issue.project_id}/resolved_${Date.now()}.${fileExt}`;
      const { error: uploadErr } = await supabase.storage.from('project-photos').upload(filePath, fixFile);
      if (uploadErr) throw uploadErr;
      const { data: urlData } = supabase.storage.from('project-photos').getPublicUrl(filePath);
      await supabase.from('media').update({
        resolved: true,
        resolved_at: new Date().toISOString(),
        resolved_by: currentUser?.id,
        resolved_file_path: urlData.publicUrl,
        resolved_comment: fixComment || 'Hiba sikeresen javítva.'
      }).eq('id', issue.id);
      await supabase.from('projects').update({ updated_at: new Date().toISOString() }).eq('id', issue.project_id);
      setFixComment('');
      setFixFile(null);
      setExpandedIssueId(null);
      await loadIssues();
      alert("Javítás sikeresen rögzítve! Köszönjük a munkádat!");
    } catch (err) {
      setError("Hiba történt: " + err.message);
    } finally {
      setSavingFix(false);
    }
  };

  const openIssues = issues.filter(i => !i.resolved);
  const resolvedIssues = issues.filter(i => i.resolved);
  const displayedIssues = activeTab === 'open' ? openIssues : resolvedIssues;

  const tabStyle = (tabName) => ({
    flex: 1, padding: '9px 0', textAlign: 'center', fontSize: '12px', fontWeight: '700',
    borderRadius: '10px', border: activeTab === tabName ? '1px solid var(--b1)' : '1px solid transparent',
    cursor: 'pointer', transition: 'all 0.2s ease',
    background: activeTab === tabName ? 'var(--s2)' : 'transparent',
    color: activeTab === tabName ? 'var(--t1)' : 'var(--t3)',
  });

  if (loading) {
    return (
      <div className="page active flex items-center justify-center h-screen">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--blue)" strokeWidth="2.5" className="spinner">
          <path d="M21 12a9 9 0 11-6.219-8.56" />
        </svg>
      </div>
    );
  }

  return (
    <div className="page active" id="p-issues">
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
          <div className="pg-greet">Központi hibajegy követés</div>
          <div className="pg-title">Hibák / Visszajárás</div>
        </div>
        <div className="hdr-btn" style={{ background: 'rgba(255,59,48,0.10)', color: 'var(--red)', border: '1px solid rgba(255,59,48,0.22)' }}><Icon name="warning" size={16} color="var(--red)" strokeWidth={2.2} /></div>
      </div>

      {error && (
        <div className="mt-4 p-3 rounded-xl text-xs"
          style={{ background: 'rgba(255,59,48,0.08)', border: '1px solid rgba(255,59,48,0.18)', color: 'var(--red)', marginLeft: '15px', marginRight: '15px' }}>
          {error}
        </div>
      )}

      {/* Tab selector */}
      <div className="p-1 rounded-xl flex items-center" style={{ background: 'var(--s1)', border: '1px solid var(--b1)', marginLeft: '15px', marginRight: '15px', marginTop: '12px', marginBottom: '15px' }}>
        <div className="active:scale-[0.98] transition-all" onClick={() => { setActiveTab('open'); setExpandedIssueId(null); }} style={{ ...tabStyle('open'), display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
          <Icon name="dot-red" size={10} /> Nyitott hibák ({openIssues.length})
        </div>
        <div className="active:scale-[0.98] transition-all" onClick={() => { setActiveTab('resolved'); setExpandedIssueId(null); }} style={{ ...tabStyle('resolved'), display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
          <Icon name="dot-green" size={10} /> Javított ({resolvedIssues.length})
        </div>
      </div>

      <div className="shdr fu d1" style={{ marginLeft: '15px', marginRight: '15px', marginBottom: '10px' }}>
        <div className="shdr-t">{activeTab === 'open' ? 'Elhárításra váró akadályok' : 'Sikeresen lezárt hibajegyek'}</div>
        <div className="shdr-a">{displayedIssues.length} db</div>
      </div>

      <div className="space-y-4 pb-20 fu d2" style={{ paddingLeft: '15px', paddingRight: '15px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {displayedIssues.length === 0 ? (
          <div className="text-center py-10" style={{ background: 'var(--s1)', border: '1px solid var(--b1)', borderRadius: '16px', fontSize: '13px', color: 'var(--t3)', fontStyle: 'italic' }}>
            Nincsenek {activeTab === 'open' ? 'aktív hibák' : 'javított hibajegyek'} a rendszerben.
          </div>
        ) : (
          displayedIssues.map(issue => {
            const formattedDate = new Date(issue.created_at).toLocaleDateString('hu-HU', {
              month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
            });

            return (
              <div key={issue.id} className="p-3.5 flex flex-col space-y-3 relative active:scale-[0.99] transition-all" style={{
                background: 'var(--s1)',
                border: issue.resolved ? '1px solid rgba(46,209,88,0.25)' : '1px solid rgba(255,59,48,0.25)',
                borderRadius: '16px',
                backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
              }}>
                {/* Fejléc */}
                <div className="flex justify-between items-start cursor-pointer" style={{ display: 'flex', justifyContent: 'between', alignItems: 'start', width: '100%' }} onClick={() => navigate(`/project/${issue.project_id}`)}>
                  <div>
                    <span style={{
                      display: 'inline-block', fontSize: '9px', fontWeight: '700', textTransform: 'uppercase',
                      letterSpacing: '0.05em', padding: '3px 8px', borderRadius: '20px',
                      background: issue.resolved ? 'rgba(46,209,88,0.12)' : 'rgba(255,59,48,0.12)',
                      color: issue.resolved ? 'var(--green)' : 'var(--red)',
                      border: issue.resolved ? '1px solid rgba(46,209,88,0.22)' : '1px solid rgba(255,59,48,0.22)',
                    }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><Icon name="bolt" size={10} strokeWidth={2.5} /> {issue.projects?.serial_number || 'Projekt'}</span>
                    </span>
                    <div style={{ fontWeight: '700', color: 'var(--t1)', fontSize: '14px', marginTop: '5px' }}>
                      {issue.projects?.name || 'Névtelen Projekt'}
                    </div>
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--t3)', textAlign: 'right' }}>{formattedDate}</div>
                </div>

                {/* NYITOTT HIBA */}
                {!issue.resolved && (
                  <>
                    <div className="flex space-x-3 items-start pt-2" style={{ borderTop: '1px solid var(--b1)', display: 'flex', gap: '12px', alignItems: 'start' }}>
                      {issue.file_path && (
                        <a href={issue.file_path} target="_blank" rel="noreferrer"
                          style={{
                            width: '76px', height: '76px', borderRadius: '10px', flexShrink: 0, display: 'block',
                            backgroundImage: `url(${issue.file_path})`, backgroundSize: 'cover', backgroundPosition: 'center',
                            border: '1px solid var(--b1)',
                          }}
                        />
                      )}
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '10px', color: 'var(--t3)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '5px', textAlign: 'left' }}>Eredeti Probléma</div>
                        <div style={{
                          fontSize: '12px', color: 'var(--red)', fontWeight: '500', lineHeight: '1.45',
                          fontStyle: 'italic', background: 'rgba(255,59,48,0.06)', padding: '8px 10px',
                          borderRadius: '8px', border: '1px solid rgba(255,59,48,0.10)', textAlign: 'left',
                          display: 'flex', alignItems: 'flex-start', gap: '6px'
                        }}>
                          <Icon name="warning" size={13} color="var(--red)" strokeWidth={2.2} style={{ marginTop: '2px' }} />
                          <span>{issue.description || 'Hiba leírás nélkül feltöltve.'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-between items-center pt-2" style={{ borderTop: '1px solid var(--b1)', display: 'flex', justifyContent: 'between', alignItems: 'center', width: '100%' }}>
                      <span style={{ fontSize: '10px', color: 'var(--t3)' }}>
                        Bejelentette: <b style={{ color: 'var(--t2)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}><Icon name="worker" size={11} color="var(--t2)" strokeWidth={2} /> {issue.profiles?.full_name || 'Szerelő'}</b>
                      </span>
                      <button
                        onClick={() => setExpandedIssueId(expandedIssueId === issue.id ? null : issue.id)}
                        className="active:scale-95 transition-all"
                        style={{
                          padding: '6px 12px', borderRadius: '8px', fontWeight: '700', fontSize: '10px',
                          cursor: 'pointer', border: 'none', fontFamily: 'inherit',
                          background: 'linear-gradient(135deg,#ffd60a,#ccab00)',
                          color: '#000', boxShadow: '0 4px 12px rgba(255,214,10,0.2)',
                        }}
                      >
                        {expandedIssueId === issue.id ? 'Mégsem' : (<span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}><Icon name="tool" size={11} color="#000" strokeWidth={2.5} /> Javítás rögzítése</span>)}
                      </button>
                    </div>

                    {/* Javítás panel */}
                    {expandedIssueId === issue.id && (
                      <div className="mt-2 p-3 space-y-3" style={{ background: 'var(--s1)', borderRadius: '10px', border: '1px solid var(--b1)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--yellow)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Icon name="tool" size={13} color="var(--yellow)" strokeWidth={2.2} /> Hiba elhárításának rögzítése
                        </div>
                        <form onSubmit={(e) => handleResolveIssue(e, issue)} className="space-y-3" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          <div>
                            <label style={{ display: 'block', fontSize: '9px', color: 'var(--t3)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '8px', textAlign: 'left' }}>
                              Fénykép a javításról (KÖTELEZŐ)
                            </label>
                            
                            <div className="flex flex-col items-center justify-center pt-1" style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
                              <label 
                                className="btn active:scale-95 transition-all flex items-center justify-center cursor-pointer"
                                style={{
                                  background: 'rgba(79, 142, 247, 0.15)',
                                  border: '1px solid rgba(79, 142, 247, 0.35)',
                                  borderRadius: '12px',
                                  color: 'var(--blue)',
                                  padding: '10px 14px',
                                  fontSize: '12px',
                                  fontWeight: '700',
                                  gap: '8px',
                                  width: 'fit-content',
                                  boxShadow: '0 4px 12px rgba(79, 142, 247, 0.1)'
                                }}
                              >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                  <polyline points="17 8 12 3 7 8" />
                                  <line x1="12" y1="3" x2="12" y2="15" />
                                </svg>
                                <span>{fixFile ? fixFile.name : 'Fotó Kiválasztása'}</span>
                                <input 
                                  type="file" 
                                  accept="image/*" 
                                  onChange={(e) => setFixFile(e.target.files?.[0] || null)} 
                                  style={{ display: 'none' }} 
                                  required
                                />
                              </label>
                            </div>
                          </div>
                          <div>
                            <label style={{ display: 'block', fontSize: '9px', color: 'var(--t3)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '5px', textAlign: 'left' }}>
                              Rövid leírás (opcionális)
                            </label>
                            <input
                              type="text"
                              value={fixComment}
                              onChange={(e) => setFixComment(e.target.value)}
                              placeholder="pl. Kicseréltem a kábelt..."
                              style={{
                                background: 'var(--s1)', border: '1px solid var(--b1)', borderRadius: '8px',
                                padding: '7px 10px', color: 'var(--t1)', fontSize: '12px',
                                width: '100%', outline: 'none', fontFamily: 'inherit',
                              }}
                            />
                          </div>
                          <button
                            type="submit"
                            disabled={savingFix}
                            className="active:scale-[0.98] transition-all"
                            style={{
                              width: '100%', padding: '10px', borderRadius: '10px', fontWeight: '700',
                              fontSize: '13px', cursor: savingFix ? 'default' : 'pointer', border: 'none',
                              fontFamily: 'inherit', background: 'linear-gradient(135deg,#2ed158,#1ca542)',
                              color: '#fff', boxShadow: '0 6px 15px rgba(46,209,88,0.25)',
                            }}
                          >
                            {savingFix ? 'Mentés folyamatban...' : 'Javítás Mentése és Lezárás'}
                          </button>
                        </form>
                      </div>
                    )}
                  </>
                )}

                {/* JAVÍTOTT HIBA - BEFORE / AFTER */}
                {issue.resolved && (
                  <>
                    <div className="grid grid-cols-2 gap-3 pt-2" style={{ borderTop: '1px solid var(--b1)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div className="flex flex-col space-y-1.5" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <div style={{ fontSize: '9px', color: 'var(--red)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: 'left', display: 'inline-flex', alignItems: 'center', gap: '4px' }}><Icon name="dot-red" size={9} /> Eredeti hiba</div>
                        <a href={issue.file_path} target="_blank" rel="noreferrer" style={{
                          display: 'block', aspectRatio: '4/3', borderRadius: '8px',
                          backgroundImage: `url(${issue.file_path})`, backgroundSize: 'cover', backgroundPosition: 'center',
                          border: '1px solid rgba(255,59,48,0.18)', width: '100%'
                        }} />
                        <div style={{ fontSize: '10px', color: 'var(--t2)', fontStyle: 'italic', lineHeight: '1.3', padding: '6px 8px', borderRadius: '6px', background: 'var(--s1)', border: '1px solid var(--b1)', textAlign: 'left' }}>
                          {issue.description || 'Nem volt leírás.'}
                        </div>
                      </div>
                      <div className="flex flex-col space-y-1.5" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <div style={{ fontSize: '9px', color: 'var(--green)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: 'left', display: 'inline-flex', alignItems: 'center', gap: '4px' }}><Icon name="dot-green" size={9} /> Elvégzett javítás</div>
                        <a href={issue.resolved_file_path} target="_blank" rel="noreferrer" style={{
                          display: 'block', aspectRatio: '4/3', borderRadius: '8px',
                          backgroundImage: `url(${issue.resolved_file_path})`, backgroundSize: 'cover', backgroundPosition: 'center',
                          border: '1px solid rgba(46,209,88,0.18)', width: '100%'
                        }} />
                        <div style={{ fontSize: '10px', color: 'var(--green)', fontStyle: 'italic', lineHeight: '1.3', padding: '6px 8px', borderRadius: '6px', background: 'rgba(46,209,88,0.05)', border: '1px solid rgba(46,209,88,0.10)', textAlign: 'left' }}>
                          {issue.resolved_comment || 'Javítva.'}
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-between items-center pt-2" style={{ borderTop: '1px solid var(--b1)', display: 'flex', justifyContent: 'between', alignItems: 'center', width: '100%' }}>
                      <span style={{ fontSize: '9px', color: 'var(--t3)' }}>
                        Jelentette: <b style={{ color: 'var(--t2)' }}>{issue.profiles?.full_name || 'Ismeretlen'}</b>
                      </span>
                      <span style={{ fontSize: '9px', color: 'var(--green)', fontWeight: '600' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}><Icon name="check-circle" size={11} color="var(--green)" strokeWidth={2.5} /> Javította: <b>{issue.resolved_by_profile?.full_name || 'Szerelő'}</b></span>
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
