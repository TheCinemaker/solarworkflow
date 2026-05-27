import { useNavigate, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

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
  const [currentUser, setCurrentUser] = useState(null);
  
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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

  // Fénykép feltöltése megjegyzéssel együtt
  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);

    try {
      // Egyedi fájlnév generálása timestamp-pel a felülírás ellen
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${id}/${fileName}`;

      // 1. Fájl feltöltése a Supabase Storage-ba
      const { error: uploadErr } = await supabase.storage
        .from('project-photos')
        .upload(filePath, file);

      if (uploadErr) throw uploadErr;

      // 2. Publikus URL lekérése
      const { data: urlData } = supabase.storage
        .from('project-photos')
        .getPublicUrl(filePath);

      const publicUrl = urlData.publicUrl;

      // 3. Rekord mentése a public.media táblába a megjegyzéssel és a hiba flaggel együtt
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

      // 4. "Megbökjük" a projekt tábla updated_at mezőjét, hogy a Realtime azonnal frissítsen mindenkit
      await supabase
        .from('projects')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', id);

      // Siker! Űrlap törlése és adatok újratöltése
      setPhotoComment('');
      setIsIssue(false);
      await loadData();
      alert("Fénykép sikeresen feltöltve!");
    } catch (err) {
      console.error("Feltöltési hiba:", err);
      setError("Feltöltés sikertelen: " + err.message);
    } finally {
      setUploading(false);
    }
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
      <div className="back-btn fu" onClick={() => navigate('/')}>‹ Vissza a Dashboardra</div>

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

      {/* Kép feltöltése zóna és megjegyzés rovat */}
      <div className="px-5 fu d4 space-y-3">
        <div>
          <label style={{
            color: 'var(--t2)',
            fontSize: '11px',
            fontWeight: '600',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            marginBottom: '5px',
            display: 'block'
          }}>Megjegyzés a képhez (opcionális)</label>
          <input 
            type="text" 
            value={photoComment} 
            onChange={(e) => setPhotoComment(e.target.value)}
            placeholder="Írd le mi látható a képen, vagy mi a probléma..."
            style={{
              background: 'var(--s1)',
              border: '1px solid var(--b1)',
              borderRadius: '10px',
              padding: '8px 12px',
              color: 'var(--t1)',
              fontSize: '13px',
              width: '100%',
              outline: 'none'
            }}
          />
        </div>

        {/* Hiba bejelentése checkbox */}
        <div className="flex items-center space-x-2.5 py-1">
          <div 
            onClick={() => setIsIssue(!isIssue)} 
            className="w-5.5 h-5.5 rounded-md flex items-center justify-center border cursor-pointer transition-all"
            style={{
              background: isIssue ? 'rgba(255, 59, 48, 0.25)' : 'rgba(255,255,255,0.05)',
              borderColor: isIssue ? 'var(--red)' : 'rgba(255,255,255,0.2)'
            }}
          >
            {isIssue && <span className="text-red-400 text-xs font-bold">✓</span>}
          </div>
          <span 
            onClick={() => setIsIssue(!isIssue)}
            className="text-xs font-bold cursor-pointer select-none"
            style={{ color: isIssue ? 'var(--red)' : 'var(--t2)' }}
          >
            ⚠️ Hiba / Akadály bejelentése (Hiba fotóként jelölve)
          </span>
        </div>

        <label className="upload-area block relative overflow-hidden" style={{ background: 'var(--s1)', border: '1.5px dashed var(--b2)', borderRadius: '22px' }}>
          <input 
            type="file" 
            accept="image/*" 
            onChange={handlePhotoUpload} 
            disabled={uploading}
            className="hidden" 
          />
          {uploading ? (
            <div className="py-6 flex flex-col items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-2"></div>
              <div className="ua-t">Checkpoint feltöltése...</div>
            </div>
          ) : (
            <div className="py-4 text-center cursor-pointer">
              <span className="ua-ico text-3xl block mb-1">📸</span>
              <span className="ua-t text-sm font-bold text-slate-200">Kép rögzítése és beküldése</span>
              <span className="ua-s text-[10px] text-slate-400 block mt-1">Kattints a kamera megnyitásához vagy fájl választáshoz</span>
            </div>
          )}
        </label>
      </div>

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
                    border: photo.is_issue ? '1px solid rgba(255, 59, 48, 0.4)' : '1px solid var(--b1)',
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
                      background: photo.is_issue ? 'rgba(255, 59, 48, 0.85)' : 'rgba(46, 209, 88, 0.85)',
                      backdropFilter: 'blur(4px)',
                      WebkitBackdropFilter: 'blur(4px)'
                    }}>
                      {photo.is_issue ? '⚠️ Hiba' : '🟢 Haladás'}
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
                        background: photo.is_issue ? 'rgba(255, 59, 48, 0.08)' : 'rgba(255, 255, 255, 0.03)', 
                        borderColor: photo.is_issue ? 'rgba(255, 59, 48, 0.15)' : 'rgba(255, 255, 255, 0.06)',
                        color: photo.is_issue ? 'var(--red)' : 'var(--t1)'
                      }}>
                        💬 {photo.description}
                      </div>
                    ) : (
                      <div className="text-[10px] text-slate-500 italic mt-1">Nincs leírás</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
