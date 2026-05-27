import { useNavigate, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import EditProjectModal from '../components/EditProjectModal';

export default function ProjectDetails() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [completedTasks, setCompletedTasks] = useState([]);
  
  // Fényképek, megjegyzések és feltöltés állapotai
  const [photos, setPhotos] = useState([]);
  const [photoComment, setPhotoComment] = useState('');
  const [isIssue, setIsIssue] = useState(false); // Hiba/Munkafolyamat megkülönböztetés
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null); // Feltöltendő fájl átmenetileg
  const [filePreview, setFilePreview] = useState(null); // Előnézet URL
  
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Élő Napelem Telemetria Demo állapotok
  const [showLiveTelemetry, setShowLiveTelemetry] = useState(false);
  const [simulatedPower, setSimulatedPower] = useState(3.82);

  useEffect(() => {
    let interval;
    if (showLiveTelemetry) {
      interval = setInterval(() => {
        // Fluktuáltatjuk a pillanatnyi teljesítményt 3.75 és 3.89 kW között
        setSimulatedPower(parseFloat((3.75 + Math.random() * 0.14).toFixed(2)));
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [showLiveTelemetry]);

  // Projekt adatok és fényképek betöltése
  async function loadData() {
    try {
      if (!id) return;

      // 1. Felhasználó lekérése a feltöltő azonosításához
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);

      // 2. Projekt betöltése
      const { data: projData, error: projErr } = await supabase
        .from('projects')
        .select('*')
        .eq('id', id)
        .single();

      if (projErr) throw projErr;
      if (projData) {
        setProject(projData);
        // Feladatlista feldolgozása (soronként bontva, üres sorok nélkül)
        if (projData.tasks) {
          const parsed = projData.tasks.split('\n').map(t => t.trim()).filter(Boolean);
          setTasks(parsed);
        }
        // Kész feladatok beállítása
        if (projData.completed_tasks) {
          setCompletedTasks(projData.completed_tasks);
        }
      }

      // 3. Fényképek és megjegyzések betöltése a public.media táblából
      const { data: mediaData, error: mediaErr } = await supabase
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
          created_at,
          profiles:profiles!user_id (full_name, serial_number)
        `)
        .eq('project_id', id)
        .order('created_at', { ascending: false });

      if (mediaErr) throw mediaErr;
      if (mediaData) {
        setPhotos(mediaData);
      }
    } catch (err) {
      console.error("Hiba az adatok betöltésekor:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();

    // REALTIME SUBSCRIBER: Valós idejű frissítés a projekten történő módosításokkor
    const channel = supabase
      .channel(`project-${id}-realtime-sync`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'projects', 
        filter: `id=eq.${id}` 
      }, () => {
        loadData();
      })
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'media', 
        filter: `project_id=eq.${id}` 
      }, () => {
        loadData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

  // Feladat befejezésének mentése
  const handleToggleTask = async (taskName) => {
    let updated;
    if (completedTasks.includes(taskName)) {
      updated = completedTasks.filter(t => t !== taskName);
    } else {
      updated = [...completedTasks, taskName];
    }
    setCompletedTasks(updated);

    // Mentés az adatbázisba
    const { error: updateErr } = await supabase
      .from('projects')
      .update({ completed_tasks: updated })
      .eq('id', id);

    if (updateErr) {
      console.error("Nem sikerült menteni a feladat állapotot:", updateErr);
    }
  };

  // Kép kiválasztása - megnyitja a varázslót
  const handlePhotoSelected = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setFilePreview(URL.createObjectURL(file));
    e.target.value = ''; // Reset input
  };

  // Kép feltöltése a varázslóból
  const submitPhotoUpload = async (e) => {
    e.preventDefault();
    if (!selectedFile) return;

    if (isIssue && !photoComment.trim()) {
      alert("Hiba / Blokk fotó bejelentése esetén a megjegyzés (hiba leírása) KÖTELEZŐ! Kérjük, írd le mi a probléma!");
      return;
    }

    setUploading(true);
    setError(null);

    try {
      // Egyedi fájlnév generálása timestamp-pel
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${id}/${fileName}`;

      // 1. Fájl feltöltése a Supabase Storage-ba
      const { error: uploadErr } = await supabase.storage
        .from('project-photos')
        .upload(filePath, selectedFile);

      if (uploadErr) throw uploadErr;

      // 2. Publikus URL lekérése
      const { data: urlData } = supabase.storage
        .from('project-photos')
        .getPublicUrl(filePath);

      const publicUrl = urlData.publicUrl;

      // 3. Rekord mentése a public.media táblába
      const { error: dbInsertErr } = await supabase
        .from('media')
        .insert([{
          project_id: id,
          user_id: currentUser?.id,
          file_path: publicUrl,
          description: photoComment || '',
          is_issue: isIssue
        }]);

      if (dbInsertErr) throw dbInsertErr;

      // 4. "Megbökjük" a projekt táblát a valós idejű szinkronizációhoz
      await supabase
        .from('projects')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', id);

      // Sikeres befejezés
      setSelectedFile(null);
      setFilePreview(null);
      setPhotoComment('');
      setIsIssue(false);
      await loadData();
      alert("Fénykép sikeresen feltöltve! 👍");
    } catch (err) {
      console.error("Feltöltési hiba:", err);
      setError("Feltöltés sikertelen: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  // Visszavonás
  const cancelPhotoUpload = () => {
    setSelectedFile(null);
    setFilePreview(null);
    setPhotoComment('');
    setIsIssue(false);
  };

  const handleArchiveProject = async () => {
    if (window.confirm("Biztosan archiválod ezt a projektet? Lezárás után átkerül az Archiváltak közé.")) {
      const { error } = await supabase.from('projects').update({ archived: true }).eq('id', id);
      if (error) alert(error.message);
      else {
        alert("Projekt sikeresen archiválva!");
        navigate('/projects');
      }
    }
  };

  const handleRestoreProject = async () => {
    const { error } = await supabase.from('projects').update({ archived: false }).eq('id', id);
    if (error) alert(error.message);
    else {
      alert("Projekt visszaállítva aktív állapotba!");
      await loadData();
    }
  };

  if (loading) {
    return (
      <div className="page active flex items-center justify-center h-screen text-slate-400">
        Adatok betöltése...
      </div>
    );
  }

  // Készültségi százalék számolása
  const progressPercent = tasks.length > 0 ? Math.round((completedTasks.length / tasks.length) * 100) : 0;

  return (
    <div className="page active scroll-area" id="p-detail">
      <div className="flex justify-between items-center px-5 mb-2.5 fu">
        <div className="back-btn" style={{ margin: 0 }} onClick={() => navigate('/')}>‹ Vissza a Dashboardra</div>
        <button 
          onClick={() => setIsEditModalOpen(true)}
          className="px-3.5 py-1.5 rounded-xl font-black text-[10px] uppercase tracking-wider transition-all hover:scale-[1.03] active:scale-97 flex items-center space-x-1"
          style={{
            background: 'rgba(79, 142, 247, 0.12)',
            color: 'var(--blue)',
            border: '1px solid rgba(79, 142, 247, 0.25)'
          }}
        >
          <span>✏️ Projekt Szerkesztése</span>
        </button>
      </div>

      {/* Archivált Banner */}
      {project?.archived && (
        <div className="mx-5 mb-4 p-3 rounded-2xl flex items-center justify-between text-xs font-semibold" style={{ background: 'rgba(255, 214, 10, 0.12)', border: '1px solid rgba(255, 214, 10, 0.25)', color: '#ffd60a' }}>
          <div className="flex items-center space-x-2">
            <span>🗂</span>
            <span>Ez egy lezárt, archivált projekt.</span>
          </div>
          <button 
            onClick={handleRestoreProject}
            className="px-2.5 py-1 rounded-lg font-bold transition-all hover:scale-[1.03]"
            style={{ background: '#ffd60a', color: '#000', border: 'none' }}
          >
            Visszaállítás aktívvá
          </button>
        </div>
      )}
      
      {/* Fő Kártya (Hero Panel) */}
      <div className="dhero fu d1">
        <div className="dh-tag">⚡ Projekt Adatlap {project?.serial_number ? `· ${project.serial_number}` : ''}</div>
        <div className="dh-name">{project?.name || 'Névtelen Projekt'}</div>
        <div className="dh-addr">📍 {project?.address || 'Nincs cím megadva'}</div>
        
        {/* Készültségi sáv */}
        <div className="mt-4">
          <div className="flex justify-between items-center text-xs text-slate-300 mb-1.5 font-semibold">
            <span>Készültségi szint</span>
            <span>{progressPercent}%</span>
          </div>
          <div className="pbar" style={{ height: '6px' }}>
            <div className="pfill" style={{ width: `${progressPercent}%`, background: 'var(--green)' }}></div>
          </div>
        </div>
      </div>

      {/* NAPELEM ELEKTROMOS TELEMETRIA VAGY AKTIVÁLÓ GOMB */}
      {!project?.inverter_brand ? (
        <div className="px-5 mt-3.5 fu d1">
          <div 
            onClick={async () => {
              const brand = window.prompt("Milyen invertert szereltek ezen a projekten?\n(pl. Fronius, SolarEdge, Huawei, Growatt)\n\nHa beírod a márkát, az app azonnal aktiválja az élő telemetria monitort!");
              if (brand) {
                const { error: updateErr } = await supabase
                  .from('projects')
                  .update({ inverter_brand: brand })
                  .eq('id', id);
                if (updateErr) {
                  alert("Hiba a mentéskor: " + updateErr.message);
                } else {
                  loadData();
                }
              }
            }}
            className="p-3.5 rounded-3xl flex items-center justify-between cursor-pointer transition-all hover:bg-white/[0.02] active:scale-98"
            style={{
              background: 'var(--s1)',
              border: '1px dashed var(--b1)',
            }}
          >
            <div className="flex items-center space-x-3">
              <span className="text-xl">☀️</span>
              <div className="text-left">
                <div className="text-xs font-black text-slate-300 tracking-tight">Napelemes távfelügyelet beállítása</div>
                <div className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">Inverter API távoli elérés konfigurálása</div>
              </div>
            </div>
            <span className="text-[10px] bg-white/5 border border-white/10 px-2.5 py-1 rounded-full text-slate-400 font-black uppercase tracking-wider">Aktiválás ›</span>
          </div>
        </div>
      ) : (
        <div className="px-5 mt-3.5 fu d1">
          <div 
            className="p-4 rounded-3xl overflow-hidden transition-all duration-300 relative"
            style={{
              background: 'linear-gradient(135deg, rgba(7, 9, 15, 0.9), rgba(15, 23, 42, 0.8))',
              border: showLiveTelemetry ? '1px solid rgba(46, 209, 88, 0.3)' : '1px solid var(--b1)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              boxShadow: showLiveTelemetry ? '0 10px 30px rgba(46, 209, 88, 0.08)' : 'none'
            }}
          >
            {/* Felső információs sáv */}
            <div className="flex justify-between items-center mb-3">
              <div className="flex items-center space-x-2">
                <span className="text-base">⚡</span>
                <span className="text-xs font-extrabold uppercase tracking-wider text-slate-200">
                  {showLiveTelemetry ? 'Élő Termelés Követés' : 'Inverter Telemetria'}
                </span>
              </div>
              
              <div className="flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-[9px] font-extrabold uppercase tracking-wider text-emerald-400">DEMO MÓD ({project.inverter_brand})</span>
              </div>
            </div>

            {!showLiveTelemetry ? (
              // Összecsukott, tiszta állapot
              <div className="flex justify-between items-center">
                <div className="text-xs text-slate-400 font-medium">
                  Készülék: <span className="text-slate-200 font-bold">{project.inverter_brand} (3-fázis)</span>
                </div>
                <button 
                  onClick={() => setShowLiveTelemetry(true)}
                  className="px-3.5 py-1.5 rounded-full font-extrabold text-[10px] uppercase tracking-wider transition-all hover:scale-[1.03]"
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    color: 'var(--t1)',
                    border: '1px solid var(--b1)'
                  }}
                >
                  Monitor Megnyitása
                </button>
              </div>
            ) : (
              // Kibővített, sci-fi Apple műszerfal grafikonnal és valós idejű fluktuációval
              <div className="space-y-4 animate-[fadeIn_0.3s_ease-out]">
                {/* Telemetria Rács */}
                <div className="grid grid-cols-2 gap-3.5">
                  {/* 1. kártya: Pillanatnyi teljesítmény */}
                  <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/[0.04] flex flex-col justify-between">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Aktuális erő</span>
                    <div className="flex items-baseline space-x-1 mt-1.5">
                      <span className="text-2xl font-black text-emerald-400 tracking-tight transition-all duration-300">
                        {simulatedPower}
                      </span>
                      <span className="text-xs font-bold text-slate-400">kW</span>
                    </div>
                    <span className="text-[8px] text-emerald-500/80 font-bold mt-1">● Élő adás a tetőről</span>
                  </div>

                  {/* 2. kártya: Napi összes termelés */}
                  <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/[0.04] flex flex-col justify-between">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Mai termelés</span>
                    <div className="flex items-baseline space-x-1 mt-1.5">
                      <span className="text-2xl font-black text-slate-200 tracking-tight">14.82</span>
                      <span className="text-xs font-bold text-slate-400">kWh</span>
                    </div>
                    <span className="text-[8px] text-slate-500 font-medium mt-1">Összesített napi hozam</span>
                  </div>
                </div>

                {/* Grafikon Zóna: Gyönyörű neon-zöld SVG szinusz hullám */}
                <div className="p-3.5 rounded-2xl bg-black/20 border border-white/[0.03] relative overflow-hidden">
                  <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Termelési görbe (Ma)</span>
                  
                  {/* Neon vonal diagram */}
                  <div className="w-full h-16 flex items-end">
                    <svg viewBox="0 0 100 30" className="w-full h-full overflow-visible">
                      <defs>
                        <linearGradient id="chart-glow" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#10b981" stopOpacity="0.4" />
                          <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                        </linearGradient>
                      </defs>
                      {/* Kitöltött árnyékolás */}
                      <path 
                        d="M0,30 Q25,25 35,15 T65,8 T85,25 T100,30 L100,30 L0,30 Z" 
                        fill="url(#chart-glow)" 
                      />
                      {/* Fő görbe */}
                      <path 
                        d="M0,30 Q25,25 35,15 T65,8 T85,25 T100,30" 
                        fill="none" 
                        stroke="#10b981" 
                        strokeWidth="1.5" 
                        strokeLinecap="round"
                      />
                      {/* Aktuális időpont kör jelölő */}
                      <circle cx="65" cy="8" r="2.5" fill="#fff" className="animate-ping" style={{ transformOrigin: '65px 8px' }} />
                      <circle cx="65" cy="8" r="1.5" fill="#10b981" />
                    </svg>
                  </div>
                  <div className="flex justify-between items-center text-[7px] text-slate-500 font-bold uppercase tracking-wider mt-2.5">
                    <span>06:00 (Napfelkelte)</span>
                    <span className="text-emerald-400 font-extrabold">12:35 (Most)</span>
                    <span>20:00 (Naplemente)</span>
                  </div>
                </div>

                {/* Részletek és Összecsukás */}
                <div className="flex justify-between items-center pt-1">
                  <div className="text-[10px] text-slate-400">
                    IP: <span className="text-slate-300 font-bold">192.168.1.185</span> · {project.inverter_brand} API v2
                  </div>
                  <button 
                    onClick={() => setShowLiveTelemetry(false)}
                    className="px-3.5 py-1.5 rounded-full font-extrabold text-[10px] uppercase tracking-wider"
                    style={{
                      background: 'rgba(255, 59, 48, 0.08)',
                      color: 'var(--red)',
                      border: '1px solid rgba(255, 59, 48, 0.15)'
                    }}
                  >
                    Bezárás
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Telegram Csoport Link Gomb */}
      {project?.telegram_link && (
        <div className="px-5 mt-3.5 fu d1">
          <a 
            href={project.telegram_link} 
            target="_blank" 
            rel="noreferrer"
            className="w-full font-bold flex items-center justify-center space-x-2 pt-2.5 pb-2.5 text-center text-sm"
            style={{
              background: 'linear-gradient(135deg, #0088cc, #006699)',
              borderRadius: '12px',
              color: '#fff',
              border: '1px solid rgba(0, 136, 204, 0.4)',
              boxShadow: '0 8px 25px rgba(0, 136, 204, 0.25)'
            }}
          >
            <span>💬</span>
            <span>Közös Telegram Csoport</span>
          </a>
        </div>
      )}

      {/* Archiválás Gomb (Csak ha még nincs lezárva) */}
      {!project?.archived && (
        <div className="px-5 mt-3 fu d1 flex justify-center">
          <button 
            onClick={handleArchiveProject} 
            className="font-extrabold flex items-center justify-center space-x-1.5 pt-2 pb-2 px-5 text-center text-xs transition-all hover:scale-[1.02]"
            style={{
              background: progressPercent === 100 ? 'linear-gradient(135deg, #ffd60a, #ccab00)' : 'rgba(255, 255, 255, 0.05)',
              borderRadius: '20px',
              color: progressPercent === 100 ? '#000' : 'var(--t2)',
              border: progressPercent === 100 ? 'none' : '1px solid var(--b1)',
              boxShadow: progressPercent === 100 ? '0 8px 25px rgba(255, 214, 10, 0.15)' : 'none',
              cursor: 'pointer'
            }}
          >
            <span>🗂</span>
            <span>{progressPercent === 100 ? 'Archiválás (100% Kész!)' : 'Projekt Lezárása'}</span>
          </button>
        </div>
      )}

      {error && (
        <div className="mx-5 mt-4 p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs">
          {error}
        </div>
      )}

      {/* Megrendelő és projekt adatok */}
      <div className="shdr fu d2">
        <div className="shdr-t">Megrendelő és Időtartam</div>
      </div>

      <div className="gcard fu d2 space-y-3" style={{ background: 'var(--s1)', border: '1px solid var(--b1)' }}>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-0.5">Megrendelő</div>
            <div className="font-semibold text-slate-100">{project?.client_name || 'Nincs megadva'}</div>
          </div>
          <div>
            <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-0.5">Telefonszám</div>
            {project?.client_phone ? (
              <a href={`tel:${project.client_phone}`} className="font-semibold text-blue-400 hover:underline">
                📱 {project.client_phone}
              </a>
            ) : (
              <div className="text-slate-400 italic">Nincs megadva</div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm pt-2 border-t border-white/5">
          <div>
            <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-0.5">Kezdési Dátum</div>
            <div className="font-semibold text-slate-100">{project?.start_time || 'Nincs megadva'}</div>
          </div>
          <div>
            <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-0.5">Befejezési Dátum</div>
            <div className="font-semibold text-slate-100">{project?.end_time || 'Nincs megadva'}</div>
          </div>
        </div>

        {project?.important_info && (
          <div className="mt-2 p-2.5 rounded-xl text-xs flex items-center space-x-2" style={{ background: 'rgba(255, 159, 10, 0.1)', border: '1px solid rgba(255, 159, 10, 0.2)', color: 'var(--orange)' }}>
            <span>🔑</span>
            <div>
              <span className="font-bold">Fontos infó: </span>
              {project.important_info}
            </div>
          </div>
        )}
      </div>

      {/* Feladatlista Teendők */}
      <div className="shdr fu d3">
        <div className="shdr-t">Teendők / Munkalap</div>
        <div className="shdr-a">{completedTasks.length}/{tasks.length} kész</div>
      </div>

      <div className="gcard fu d3" style={{ background: 'var(--s1)', border: '1px solid var(--b1)' }}>
        {tasks.length === 0 ? (
          <div className="text-center text-xs text-slate-400 italic py-3">
            Ehhez a projekthez nincs feladatlista megadva.
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {tasks.map((task, idx) => {
              const isDone = completedTasks.includes(task);
              return (
                <div key={idx} className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0 cursor-pointer" onClick={() => handleToggleTask(task)}>
                  <div className="flex items-center space-x-3">
                    <div className="w-5 h-5 rounded-md flex items-center justify-center border transition-all" style={{
                      background: isDone ? 'var(--green)' : 'rgba(255,255,255,0.05)',
                      borderColor: isDone ? 'var(--green)' : 'rgba(255,255,255,0.2)'
                    }}>
                      {isDone && <span className="text-white text-xs">✓</span>}
                    </div>
                    <span className={`text-sm font-medium transition-all ${isDone ? 'text-slate-500 line-through' : 'text-slate-200'}`}>
                      {task}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Fényképek Galéria */}
      <div className="shdr fu d4">
        <div className="shdr-t">Fényképek / Checkpointok</div>
        <div className="shdr-a">{photos.length} db</div>
      </div>

      {/* Kép feltöltése zóna */}
      <div className="px-5 fu d4">
        <label className="upload-area block relative overflow-hidden" style={{ background: 'var(--s1)', border: '1.5px dashed var(--b2)', borderRadius: '22px' }}>
          <input 
            type="file" 
            accept="image/*" 
            onChange={handlePhotoSelected} 
            disabled={uploading}
            className="hidden" 
          />
          {uploading ? (
            <div className="py-6 flex flex-col items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-2"></div>
              <div className="ua-t">Feltöltés folyamatban...</div>
            </div>
          ) : (
            <div className="py-4 text-center cursor-pointer">
              <span className="ua-ico text-3xl block mb-1">📸</span>
              <span className="ua-t text-sm font-bold text-slate-200">Fénykép készítése és beküldése</span>
              <span className="ua-s text-[10px] text-slate-400 block mt-1">Kattints a kamera megnyitásához</span>
            </div>
          )}
        </label>
      </div>

      {/* KÉPFELTÖLTÉSI VARÁZSLÓ MODAL (Apple-stílusú overlay) */}
      {selectedFile && (
        <div 
          className="fixed inset-0 z-[1000] flex items-center justify-center p-4" 
          style={{ 
            background: 'rgba(7, 9, 15, 0.85)', 
            backdropFilter: 'blur(20px)', 
            WebkitBackdropFilter: 'blur(20px)' 
          }}
        >
          <div 
            className="w-full max-w-sm overflow-hidden animate-[scaleUp_0.25s_ease-out]" 
            style={{ 
              background: 'var(--s1)', 
              border: '1px solid var(--b1)', 
              borderRadius: '24px', 
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' 
            }}
          >
            {/* Modal Fejléc */}
            <div className="p-4 border-b border-white/5 flex justify-between items-center">
              <span className="text-xs font-bold text-slate-100">📸 Fénykép ellenőrzése</span>
              <button type="button" onClick={cancelPhotoUpload} className="text-slate-400 hover:text-white text-xs">Bezárás</button>
            </div>

            <form onSubmit={submitPhotoUpload} className="p-4 space-y-4">
              {/* Fotó előnézet */}
              {filePreview && (
                <div 
                  className="w-full aspect-video rounded-xl"
                  style={{
                    backgroundImage: `url(${filePreview})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    border: '1px solid var(--b1)',
                    aspectRatio: '16 / 9'
                  }}
                />
              )}

              {/* TÍPUS KIVÁLASZTÁSA (2 hatalmas, gyönyörű Apple kártya egymás mellett) */}
              <div>
                <label className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-2 block">Mi látható ezen a képen?</label>
                <div className="grid grid-cols-2 gap-3">
                  {/* Kártya 1: Munkafolyamat */}
                  <div 
                    onClick={() => setIsIssue(false)}
                    className="p-3 rounded-xl cursor-pointer flex flex-col items-center justify-center space-y-1 transition-all"
                    style={{
                      background: 'rgba(255, 255, 255, 0.02)',
                      border: !isIssue ? '2px solid var(--green)' : '1px solid var(--b1)',
                      boxShadow: !isIssue ? '0 4px 15px rgba(46, 209, 88, 0.15)' : 'none'
                    }}
                  >
                    <span className="text-xl">🟢</span>
                    <span className="text-[11px] font-bold text-slate-200">Munkafolyamat</span>
                  </div>

                  {/* Kártya 2: Hiba */}
                  <div 
                    onClick={() => setIsIssue(true)}
                    className="p-3 rounded-xl cursor-pointer flex flex-col items-center justify-center space-y-1 transition-all"
                    style={{
                      background: 'rgba(255, 255, 255, 0.02)',
                      border: isIssue ? '2px solid var(--red)' : '1px solid var(--b1)',
                      boxShadow: isIssue ? '0 4px 15px rgba(255, 59, 48, 0.15)' : 'none'
                    }}
                  >
                    <span className="text-xl">⚠️</span>
                    <span className="text-[11px] font-bold text-slate-200">Hiba / Akadály</span>
                  </div>
                </div>
              </div>

              {/* MEGJEGYZÉS (Ha hiba, akkor KÖTELEZŐ) */}
              <div>
                <label className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1 block">
                  {isIssue ? '🔴 Probléma leírása (KÖTELEZŐ)' : 'Megjegyzés a képhez (Opcionális)'}
                </label>
                <input 
                  type="text" 
                  value={photoComment} 
                  onChange={(e) => setPhotoComment(e.target.value)}
                  required={isIssue}
                  placeholder={isIssue ? "pl. Törött a napelem sarka..." : "pl. Sínek felszerelve a tetőre..."}
                  style={{
                    background: 'var(--s2)',
                    border: isIssue && !photoComment.trim() ? '1px solid rgba(255, 59, 48, 0.5)' : '1px solid var(--b1)',
                    borderRadius: '10px',
                    padding: '8px 12px',
                    color: 'var(--t1)',
                    fontSize: '12px',
                    width: '100%',
                    outline: 'none'
                  }}
                />
              </div>

              {/* AKCIÓ GOMBOK */}
              <div className="flex space-x-3 pt-2">
                <button 
                  type="button" 
                  onClick={cancelPhotoUpload} 
                  className="flex-1 py-2 font-bold text-xs rounded-xl"
                  style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--t2)', border: '1px solid var(--b1)' }}
                >
                  Mégsem
                </button>
                <button 
                  type="submit" 
                  disabled={uploading}
                  className="flex-1 py-2 font-bold text-xs rounded-xl transition-all"
                  style={{
                    background: isIssue 
                      ? 'linear-gradient(135deg, #ff3b30, #ff453a)' 
                      : 'linear-gradient(135deg, #2ed158, #1ca542)',
                    color: '#fff',
                    border: 'none',
                    boxShadow: isIssue 
                      ? '0 6px 15px rgba(255, 59, 48, 0.2)' 
                      : '0 6px 15px rgba(46, 209, 88, 0.2)'
                  }}
                >
                  {uploading ? 'Feltöltés...' : 'Fotó Beküldése'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Galéria Rács (Modern 2-oszlopos Kártyarendszer megjegyzésekkel) */}
      <div className="px-5 mt-4 pb-20 fu d5">
        {photos.length === 0 ? (
          <div className="text-center text-xs text-slate-400 italic py-6" style={{ background: 'var(--s1)', border: '1px solid var(--b1)', borderRadius: '20px' }}>
            Még nincs feltöltött fotó ehhez a projekthez.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3.5">
            {photos.map((photo, index) => {
              const formattedDate = new Date(photo.created_at).toLocaleDateString('hu-HU', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              });

              return (
                <div 
                  key={photo.id || index} 
                  className="rounded-2xl overflow-hidden flex flex-col relative"
                  style={{
                    background: 'var(--s1)',
                    border: photo.resolved 
                      ? '1px solid rgba(46, 209, 88, 0.4)' 
                      : (photo.is_issue ? '1px solid rgba(255, 59, 48, 0.4)' : '1px solid var(--b1)'),
                    backdropFilter: 'blur(8px)',
                    WebkitBackdropFilter: 'blur(8px)'
                  }}
                >
                  {/* Kép kattintható változata nagyban megnyitáshoz */}
                  <a 
                    href={photo.file_path} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="block aspect-video relative"
                    style={{
                      backgroundImage: `url(${photo.file_path})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      aspectRatio: '4 / 3'
                    }}
                  >
                    {/* Hiba vs Munkafolyamat Jelvény ráúsztatva a képre */}
                    <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[8px] font-extrabold uppercase tracking-wider text-white" style={{
                      background: photo.resolved 
                        ? 'rgba(46, 209, 88, 0.9)' 
                        : (photo.is_issue ? 'rgba(255, 59, 48, 0.9)' : 'rgba(46, 209, 88, 0.85)'),
                      backdropFilter: 'blur(4px)',
                      WebkitBackdropFilter: 'blur(4px)'
                    }}>
                      {photo.resolved ? '🟢 Kijavítva' : (photo.is_issue ? '⚠️ Hiba' : '🟢 Haladás')}
                    </div>
                  </a>
                  
                  {/* Kártya alsó rész: Feltöltő + Időpont + Megjegyzés */}
                  <div className="p-2.5 flex flex-col space-y-1 text-[11px] leading-tight">
                    <div className="flex justify-between items-center text-[9px] text-slate-400 font-semibold uppercase tracking-wider">
                      <span>👷 {photo.profiles?.full_name || 'Szerelő'}</span>
                    </div>
                    <div className="text-[9px] text-slate-500">{formattedDate}</div>
                    
                    {photo.description ? (
                      <div className="text-xs font-medium italic mt-1.5 p-1.5 rounded-lg border leading-snug" style={{ 
                        background: photo.resolved 
                          ? 'rgba(46, 209, 88, 0.05)' 
                          : (photo.is_issue ? 'rgba(255, 59, 48, 0.08)' : 'rgba(255, 255, 255, 0.03)'), 
                        borderColor: photo.resolved 
                          ? 'rgba(46, 209, 88, 0.15)' 
                          : (photo.is_issue ? 'rgba(255, 59, 48, 0.15)' : 'rgba(255, 255, 255, 0.06)'),
                        color: photo.resolved 
                          ? 'var(--green)' 
                          : (photo.is_issue ? 'var(--red)' : 'var(--t1)')
                      }}>
                        💬 {photo.description}
                      </div>
                    ) : (
                      <div className="text-[10px] text-slate-500 italic mt-1">Nincs leírás</div>
                    )}

                    {/* JAVÍTÁS KÉPE ÉS LEÍRÁSA (Ha van) */}
                    {photo.resolved && (
                      <div className="mt-2 pt-2 border-t border-white/5 space-y-1.5">
                        <div className="text-[9px] text-emerald-400 font-extrabold uppercase tracking-wider">✅ Javítás Igazolása:</div>
                        {photo.resolved_file_path && (
                          <a 
                            href={photo.resolved_file_path} 
                            target="_blank" 
                            rel="noreferrer" 
                            className="block aspect-video rounded-lg overflow-hidden border border-emerald-500/20 relative"
                            style={{
                              backgroundImage: `url(${photo.resolved_file_path})`,
                              backgroundSize: 'cover',
                              backgroundPosition: 'center',
                              aspectRatio: '16 / 9'
                            }}
                          >
                            <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-emerald-500/80 text-[7px] text-white font-bold">Nagyítás</div>
                          </a>
                        )}
                        <div className="text-[10px] text-slate-300 italic p-1.5 rounded-lg bg-emerald-500/5 border border-emerald-500/10 leading-snug">
                          🛠️ {photo.resolved_comment || 'Sikeresen javítva.'}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <EditProjectModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        project={project}
        onSuccess={() => {
          loadData();
        }}
      />
    </div>
  );
}
