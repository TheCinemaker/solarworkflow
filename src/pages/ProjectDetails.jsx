import { useNavigate, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export default function ProjectDetails() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [completedTasks, setCompletedTasks] = useState([]);
  const [photos, setPhotos] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Projekt adatok és fényképek betöltése
  async function loadData() {
    try {
      if (!id) return;

      // 1. Projekt betöltése
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

      // 2. Fényképek betöltése a Supabase Storage-ból
      // A képeket a 'project-photos' bucket {id} mappájában tároljuk
      const { data: files, error: storageErr } = await supabase.storage
        .from('project-photos')
        .list(id);

      if (!storageErr && files) {
        // Kiszűrjük a .placeholder fájlokat, ha lennének
        const imageFiles = files.filter(f => f.name !== '.emptyFolderPlaceholder');
        
        // Generálunk nyilvános URL-t minden képhez
        const photoUrls = imageFiles.map(file => {
          const { data } = supabase.storage
            .from('project-photos')
            .getPublicUrl(`${id}/${file.name}`);
          
          return {
            name: file.name,
            url: data.publicUrl,
            created_at: file.created_at
          };
        });
        
        // Dátum szerint csökkenőbe rendezzük
        photoUrls.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        setPhotos(photoUrls);
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

  // Fénykép feltöltése
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

      // Fájl feltöltése
      const { error: uploadErr } = await supabase.storage
        .from('project-photos')
        .upload(filePath, file);

      if (uploadErr) throw uploadErr;

      // Adatok újratöltése a galériához
      await loadData();
    } catch (err) {
      console.error("Feltöltési hiba:", err);
      setError("Feltöltés sikertelen: " + err.message);
    } finally {
      setUploading(false);
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
            onChange={handlePhotoUpload} 
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
              <span className="ua-t text-sm font-bold text-slate-200">Checkpoint fotó készítése / feltöltése</span>
              <span className="ua-s text-[10px] text-slate-400 block mt-1">Kattints a kamera megnyitásához vagy fájl választáshoz</span>
            </div>
          )}
        </label>
      </div>

      {/* Galéria Rács */}
      <div className="px-5 mt-4 fu d5">
        {photos.length === 0 ? (
          <div className="text-center text-xs text-slate-400 italic py-6" style={{ background: 'var(--s1)', border: '1px solid var(--b1)', borderRadius: '20px' }}>
            Még nincs feltöltött fotó ehhez a projekthez.
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2.5">
            {photos.map((photo, index) => (
              <a 
                key={index} 
                href={photo.url} 
                target="_blank" 
                rel="noreferrer" 
                className="aspect-ratio pitem block" 
                style={{
                  backgroundImage: `url(${photo.url})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  borderRadius: '12px',
                  border: '1px solid var(--b1)',
                  aspectRatio: '1 / 1'
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
