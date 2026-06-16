import { useNavigate, useParams } from 'react-router-dom';
import { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../lib/supabase';
import EditProjectModal from '../components/EditProjectModal';
import { useUser } from '../context/UserContext';
import { Icon } from '../components/Icon';
import { exportProjectPDF } from '../lib/exportProject';
import SignatureModal from '../components/SignatureModal';
import { FEATURE_FLAGS } from '../config/features';

export default function ProjectDetails() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user: profile } = useUser();
  const isAdmin = profile?.role === 'admin';
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [completedTasks, setCompletedTasks] = useState([]);
  
  // Fényképek, megjegyzések és feltöltés állapotai
  const [photos, setPhotos] = useState([]);
  const [photoComment, setPhotoComment] = useState('');
  const [isIssue, setIsIssue] = useState(false); // Hiba/Munkafolyamat megkülönböztetés
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);
  const [review, setReview] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null); // Feltöltendő fájl átmenetileg
  const [filePreview, setFilePreview] = useState(null); // Előnézet URL
  const [previewImage, setPreviewImage] = useState(null); // Nagyított kép overlay-hez
  const [zoomScale, setZoomScale] = useState(1); // Kép nagyítás mértéke (1 - 3)
  const [rotation, setRotation] = useState(0); // Kép forgatási szöge (0, 90, 180, 270)
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [startY, setStartY] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [scrollTop, setScrollTop] = useState(0);
  const [hasMoved, setHasMoved] = useState(false);
  const imageContainerRef = useRef(null);
  
  // Hiányzó anyagok és terepi akadályok
  const [isEditingMaterials, setIsEditingMaterials] = useState(false);
  const [tempMaterials, setTempMaterials] = useState('');
  
  // Belső Chat állapotok
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [sendingMsg, setSendingMsg] = useState(false);
  const chatContainerRef = useRef(null);

  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // PDF Export állapotok
  const [pdfExporting, setPdfExporting] = useState(false);
  const [pdfProgress, setPdfProgress] = useState({ current: 0, total: 0, stage: '' });

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

  // Fénykép nagyítás és drag-to-pan kezelése
  useEffect(() => {
    setZoomScale(1);
    setRotation(0);
    setIsDragging(false);
    setHasMoved(false);
  }, [previewImage]);

  // Billentyűzet kezelés a képnézegető léptetéséhez (jobbra-balra nyilak) és bezárásához (Esc)
  useEffect(() => {
    if (!previewImage) return;

    const handleKeyDown = (e) => {
      if (e.key === 'ArrowRight') {
        handleNextPhoto();
      } else if (e.key === 'ArrowLeft') {
        handlePrevPhoto();
      } else if (e.key === 'Escape') {
        setPreviewImage(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [previewImage, photos]);

  const handleMouseDown = (e) => {
    if (zoomScale === 1 || !imageContainerRef.current) return;
    setIsDragging(true);
    setHasMoved(false);
    setStartX(e.pageX - imageContainerRef.current.offsetLeft);
    setStartY(e.pageY - imageContainerRef.current.offsetTop);
    setScrollLeft(imageContainerRef.current.scrollLeft);
    setScrollTop(imageContainerRef.current.scrollTop);
  };

  const handleMouseMove = (e) => {
    if (!isDragging || zoomScale === 1 || !imageContainerRef.current) return;
    e.preventDefault();
    const x = e.pageX - imageContainerRef.current.offsetLeft;
    const y = e.pageY - imageContainerRef.current.offsetTop;
    const walkX = (x - startX) * 1.5;
    const walkY = (y - startY) * 1.5;
    
    if (Math.abs(x - startX) > 5 || Math.abs(y - startY) > 5) {
      setHasMoved(true);
    }
    
    imageContainerRef.current.scrollLeft = scrollLeft - walkX;
    imageContainerRef.current.scrollTop = scrollTop - walkY;
  };

  const handleMouseUpOrLeave = () => {
    setIsDragging(false);
  };

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

      // 4. Belső chat üzenetek betöltése
      const { data: messagesData, error: messagesErr } = await supabase
        .from('messages')
        .select(`
          id,
          content,
          created_at,
          user_id,
          profiles:profiles!user_id (full_name, role, serial_number)
        `)
        .eq('project_id', id)
        .order('created_at', { ascending: true });

      if (messagesErr) throw messagesErr;
      if (messagesData) {
        setMessages(messagesData);
      }
      // 5. Ügyfél visszajelzés (review) betöltése
      const { data: reviewData } = await supabase
        .from('reviews')
        .select('*')
        .eq('project_id', id)
        .maybeSingle();
      setReview(reviewData);
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
      }, (payload) => {
        if (payload.new) {
          setProject(payload.new);
          if (payload.new.tasks) {
            const parsed = payload.new.tasks.split('\n').map(t => t.trim()).filter(Boolean);
            setTasks(parsed);
          }
          if (payload.new.completed_tasks) {
            setCompletedTasks(payload.new.completed_tasks);
          }
        } else {
          loadData();
        }
      })
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'media', 
        filter: `project_id=eq.${id}` 
      }, () => {
        loadData();
      })
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'messages', 
        filter: `project_id=eq.${id}` 
      }, async (payload) => {
        const { data: fullMsg } = await supabase
          .from('messages')
          .select(`
            id,
            content,
            created_at,
            user_id,
            profiles:profiles!user_id (full_name, role, serial_number)
          `)
          .eq('id', payload.new.id)
          .single();
        
        if (fullMsg) {
          setMessages(prev => {
            if (prev.some(m => m.id === fullMsg.id)) return prev;
            return [...prev, fullMsg];
          });
        }
      })
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'reviews', 
        filter: `project_id=eq.${id}` 
      }, () => {
        loadData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

  // Valós idejű aláírás-érzékelés (ha a megrendelő a saját mobilján írja alá a munkalapot)
  useEffect(() => {
    if (project?.client_signature && isSignatureModalOpen) {
      setIsSignatureModalOpen(false);
      alert("A megrendelő sikeresen aláírta a munkalapot a saját készülékén!");
    }
  }, [project?.client_signature, isSignatureModalOpen]);

  // Biztonsági lekérdezés (poll) az aláírásra, amíg a modal nyitva van (ha a Supabase Realtime nem működik/nincs bekapcsolva)
  useEffect(() => {
    let intervalId;
    if (isSignatureModalOpen && !project?.client_signature) {
      intervalId = setInterval(async () => {
        try {
          const { data, error } = await supabase
            .from('projects')
            .select('client_signature, client_signature_name, client_signature_date')
            .eq('id', id)
            .single();
          
          if (!error && data && data.client_signature) {
            setProject(prev => prev ? { 
              ...prev, 
              client_signature: data.client_signature,
              client_signature_name: data.client_signature_name,
              client_signature_date: data.client_signature_date
            } : null);
            setIsSignatureModalOpen(false);
            alert("A megrendelő sikeresen aláírta a munkalapot a saját készülékén!");
          }
        } catch (err) {
          console.error("Hiba az aláírás lekérdezésekor (polling):", err);
        }
      }, 2500);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isSignatureModalOpen, project?.client_signature, id]);

  // Görgetés a legújabb chat üzenethez (csak a chat dobozon belül)
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  // Belső chat üzenet elküldése
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !currentUser) return;

    setSendingMsg(true);
    try {
      const { data, error: sendErr } = await supabase
        .from('messages')
        .insert([{
          project_id: id,
          user_id: currentUser.id,
          content: newMessage.trim()
        }])
        .select()
        .single();

      if (sendErr) throw sendErr;
      setNewMessage('');
      
      // Frissítsük a chat feedet a profil adatokkal együtt
      const { data: fullMsg } = await supabase
        .from('messages')
        .select(`
          id,
          content,
          created_at,
          user_id,
          profiles:profiles!user_id (full_name, role, serial_number)
        `)
        .eq('id', data.id)
        .single();
      
      if (fullMsg) {
        setMessages(prev => {
          if (prev.some(m => m.id === fullMsg.id)) return prev;
          return [...prev, fullMsg];
        });
      }
    } catch (err) {
      console.error("Nem sikerült elküldeni az üzenetet:", err);
    } finally {
      setSendingMsg(false);
    }
  };

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

  // Hiányzó anyagok szinkronizálása és mentése
  useEffect(() => {
    if (project && !isEditingMaterials) {
      setTempMaterials(project.missing_materials || '');
    }
  }, [project, isEditingMaterials]);

  const handleSaveMaterials = async () => {
    const { error: updateErr } = await supabase
      .from('projects')
      .update({ missing_materials: tempMaterials })
      .eq('id', id);

    if (updateErr) {
      console.error("Hiba a hiányzó anyagok mentésekor:", updateErr);
      alert("Nem sikerült menteni a hiányzó anyagokat. Kérlek győződj meg róla, hogy a Supabase SQL Editorban lefuttattad a 'supabase/add_missing_materials.sql' migrációt!");
    } else {
      setIsEditingMaterials(false);
      setProject(prev => prev ? { ...prev, missing_materials: tempMaterials } : null);
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
      alert("Fénykép sikeresen feltöltve!");
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

  // Kép elérési útjának kinyerése a nyilvános URL-ből
  const getStoragePathFromUrl = (url) => {
    if (!url) return null;
    const parts = url.split('/project-photos/');
    if (parts.length > 1) {
      return decodeURIComponent(parts[1]);
    }
    return null;
  };

  // Fénykép törlése (csak adminoknak)
  const handleDeletePhoto = async (photo) => {
    try {
      setLoading(true);
      
      if (photo.is_verification) {
        // Hibajavítás igazoló képének törlése (csak a mezők törlése a bejegyzésből)
        const storagePath = getStoragePathFromUrl(photo.file_path);
        if (storagePath) {
          const { error: storageErr } = await supabase.storage
            .from('project-photos')
            .remove([storagePath]);
          if (storageErr) {
            console.error("Storage törlési hiba (igazolás):", storageErr);
          }
        }
        
        const { error: dbErr } = await supabase
          .from('media')
          .update({
            resolved: false,
            resolved_at: null,
            resolved_comment: null,
            resolved_file_path: null,
            resolved_by: null
          })
          .eq('id', photo.id);
          
        if (dbErr) throw dbErr;
        
        alert("Igazoló kép sikeresen törölve, a hiba állapota visszaállt nyitottra.");
      } else {
        // Normál kép vagy teljes hiba-kép törlése
        const storagePath = getStoragePathFromUrl(photo.file_path);
        if (storagePath) {
          const { error: storageErr } = await supabase.storage
            .from('project-photos')
            .remove([storagePath]);
          if (storageErr) {
            console.error("Storage törlési hiba (fő kép):", storageErr);
          }
        }
        
        // Ha van hozzá igazoló kép is, azt is töröljük a Storage-ból
        if (photo.resolved_file_path) {
          const resStoragePath = getStoragePathFromUrl(photo.resolved_file_path);
          if (resStoragePath) {
            const { error: storageErr } = await supabase.storage
              .from('project-photos')
              .remove([resStoragePath]);
            if (storageErr) {
              console.error("Storage törlési hiba (igazoló kép):", storageErr);
            }
          }
        }
        
        // Törlés a media táblából
        const { error: dbErr } = await supabase
          .from('media')
          .delete()
          .eq('id', photo.id);
          
        if (dbErr) throw dbErr;
        
        alert("Fénykép sikeresen törölve.");
      }
      
      // Projekt frissítése a realtime szinkronizáció kényszerítéséhez
      await supabase
        .from('projects')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', id);
        
      setPreviewImage(null);
      await loadData();
    } catch (err) {
      console.error("Hiba a kép törlésekor:", err);
      alert("Hiba a kép törlésekor: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Kép letöltése a kliensre
  const handleDownloadPhoto = async (photoUrl, fileName) => {
    try {
      const response = await fetch(photoUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName || 'voltdesk-foto.jpg';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error("Letöltési hiba:", err);
      // Fallback: megnyitás új lapon
      window.open(photoUrl, '_blank');
    }
  };

  // Összes megtekinthető kép listája (eredeti és igazoló fotók)
  const getViewablePhotos = () => {
    const list = [];
    photos.forEach(photo => {
      list.push({
        ...photo,
        is_verification: false
      });
      if (photo.resolved && photo.resolved_file_path) {
        list.push({
          ...photo,
          file_path: photo.resolved_file_path,
          description: photo.resolved_comment || 'Sikeresen javítva.',
          created_at: photo.resolved_at || photo.created_at,
          is_verification: true
        });
      }
    });
    return list;
  };

  const handleNextPhoto = () => {
    const list = getViewablePhotos();
    if (list.length <= 1 || !previewImage) return;
    const currentIndex = list.findIndex(vp => vp.id === previewImage.id && !!vp.is_verification === !!previewImage.is_verification);
    if (currentIndex === -1) return;
    const nextIndex = (currentIndex + 1) % list.length;
    setPreviewImage(list[nextIndex]);
  };

  const handlePrevPhoto = () => {
    const list = getViewablePhotos();
    if (list.length <= 1 || !previewImage) return;
    const currentIndex = list.findIndex(vp => vp.id === previewImage.id && !!vp.is_verification === !!previewImage.is_verification);
    if (currentIndex === -1) return;
    const prevIndex = (currentIndex - 1 + list.length) % list.length;
    setPreviewImage(list[prevIndex]);
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

  const handleSaveSignature = async ({ signatureData, signerName, date }) => {
    try {
      const { error } = await supabase
        .from('projects')
        .update({
          client_signature: signatureData,
          client_signature_name: signerName,
          client_signature_date: date
        })
        .eq('id', id);

      if (error) throw error;

      setProject(prev => ({
        ...prev,
        client_signature: signatureData,
        client_signature_name: signerName,
        client_signature_date: date
      }));
      setIsSignatureModalOpen(false);
      alert('Munkalap sikeresen aláírva!');
    } catch (err) {
      console.error('Hiba az aláírás mentésekor:', err);
      alert('Sikertelen mentés: ' + err.message);
    }
  };

  const handleDeleteSignature = async () => {
    if (!window.confirm("Biztosan törölni szeretnéd a megrendelő aláírását? Ezzel az aláírás állapota visszaáll.")) return;
    try {
      const { error } = await supabase
        .from('projects')
        .update({
          client_signature: null,
          client_signature_name: null,
          client_signature_date: null
        })
        .eq('id', id);

      if (error) throw error;

      setProject(prev => ({
        ...prev,
        client_signature: null,
        client_signature_name: null,
        client_signature_date: null
      }));
      alert('Aláírás sikeresen törölve.');
    } catch (err) {
      console.error('Hiba az aláírás törlésekor:', err);
      alert('Sikertelen törlés: ' + err.message);
    }
  };

  if (loading) {
    return (
      <div className="page active flex items-center justify-center h-screen text-[var(--t3)]">
        Adatok betöltése...
      </div>
    );
  }

  // Készültségi százalék számolása
  const progressPercent = tasks.length > 0 ? Math.round((completedTasks.length / tasks.length) * 100) : 0;

  return (
    <div className="page active pb-28" id="p-detail">
      <div className="flex justify-between items-center px-[24px] mb-4 fu" style={{ paddingTop: 'calc(18px + env(safe-area-inset-top))' }}>
        {/* Vissza gomb */}
        <div 
          onClick={() => navigate('/projects')}
          className="flex items-center space-x-1 cursor-pointer select-none transition-all active:opacity-60"
          style={{ color: 'var(--blue)', fontWeight: '600', fontSize: '14px' }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
          <span>Projektek</span>
        </div>

        {/* Cím / Kontextus */}
        <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--t2)', letterSpacing: '-0.3px', opacity: 0.8 }}>
          Projekt részletei
        </div>

        {/* Műveleti gombok (PDF + Szerkesztés) */}
        <div className="flex items-center" style={{ gap: '8px' }}>
          {/* PDF Export gomb (mindenki számára elérhető) */}
          <div
            onClick={async () => {
              if (pdfExporting) return;
              setPdfExporting(true);
              setPdfProgress({ current: 0, total: 0, stage: 'Indítás...' });
              try {
                await exportProjectPDF(id, (current, total, stage) => {
                  setPdfProgress({ current, total, stage });
                });
              } catch (err) {
                console.error('PDF export hiba:', err);
                alert('Hiba a PDF generálásakor: ' + err.message);
              } finally {
                setPdfExporting(false);
              }
            }}
            className="flex items-center justify-center cursor-pointer transition-all hover:scale-[1.05] active:scale-95"
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '10px',
              background: pdfExporting ? 'rgba(46, 209, 88, 0.2)' : 'rgba(46, 209, 88, 0.12)',
              color: 'var(--green)',
              border: '1px solid rgba(46, 209, 88, 0.25)',
              opacity: pdfExporting ? 0.6 : 1,
              pointerEvents: pdfExporting ? 'none' : 'auto'
            }}
            title="Projekt PDF Letöltése"
          >
            {pdfExporting ? (
              <div className="animate-spin rounded-full" style={{ width: '14px', height: '14px', border: '2px solid var(--green)', borderTopColor: 'transparent' }} />
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="12" y1="18" x2="12" y2="12"></line>
                <polyline points="9 15 12 18 15 15"></polyline>
              </svg>
            )}
          </div>

          {/* Szerkesztés gomb (csak admin) */}
          {isAdmin ? (
            <div 
              onClick={() => setIsEditModalOpen(true)}
              className="flex items-center justify-center cursor-pointer transition-all hover:scale-[1.05] active:scale-95"
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '10px',
                background: 'rgba(79, 142, 247, 0.12)',
                color: 'var(--blue)',
                border: '1px solid rgba(79, 142, 247, 0.25)'
              }}
              title="Projekt Szerkesztése"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
            </div>
          ) : null}
        </div>
      </div>

      {/* Archivált Banner */}
      {project?.archived && (
        <div className="mx-[15px] mb-4 p-3 rounded-md flex items-center justify-between text-xs font-semibold" style={{ background: 'rgba(255, 214, 10, 0.12)', border: '1px solid rgba(255, 214, 10, 0.25)', color: 'var(--yellow)' }}>
          <div className="flex items-center space-x-2">
            <Icon name="archive" size={14} strokeWidth={2.2} />
            <span>Ez egy lezárt, archivált projekt.</span>
          </div>
          {isAdmin && (
          <button 
            onClick={handleRestoreProject}
            className="px-2.5 py-1 rounded-md font-bold transition-all hover:scale-[1.03]"
            style={{ background: 'var(--yellow)', color: '#000', border: 'none' }}
          >
            Visszaállítás aktívvá
          </button>
        )}
        </div>
      )}
      
      {/* Fő Kártya (Hero Panel) */}
      <div className="dhero fu d1" style={{ marginBottom: '15px' }}>
        <div className="dh-tag" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
          <Icon name="bolt" size={11} strokeWidth={2.5} />
          <span>Projekt Adatlap{project?.serial_number ? ` · ${project.serial_number}` : ''}</span>
        </div>
        <div className="dh-name">{project?.name || 'Névtelen Projekt'}</div>
        <div className="dh-addr" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <Icon name="pin" size={12} color="var(--t3)" strokeWidth={2} />
          <span>{project?.address || 'Nincs cím megadva'}</span>
        </div>
        
        {/* Készültségi sáv */}
        <div className="mt-4">
          <div className="flex justify-between items-center text-xs text-[var(--t2)] mb-1.5 font-semibold">
            <span>Készültségi szint</span>
            <span>{progressPercent}%</span>
          </div>
          <div className="pbar" style={{ height: '6px' }}>
            <div className="pfill" style={{ width: `${progressPercent}%`, background: 'var(--green)' }}></div>
          </div>
        </div>
      </div>

      {/* NAPELEM ELEKTROMOS TELEMETRIA VAGY AKTIVÁLÓ GOMB (CSAK NAPELEMES PROJEKTEKNÉL) */}
      {project?.is_solar && (
        !project?.inverter_brand ? (
          <div className="gcard fu d1" style={{ padding: 0, border: 'none', background: 'transparent', marginTop: '15px', marginBottom: '15px' }}>
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
              className="p-3.5 rounded-md flex items-center justify-between cursor-pointer transition-all hover:bg-white/[0.02] active:scale-98"
              style={{
                background: 'var(--s1)',
                border: '1px dashed var(--b1)',
              }}
            >
              <div className="flex items-center space-x-3">
                <Icon name="sun" size={20} color="var(--yellow)" strokeWidth={2.2} />
                <div className="text-left">
                  <div className="text-xs font-black text-[var(--t2)] tracking-tight">Napelemes távfelügyelet beállítása</div>
                  <div className="text-[9px] text-[var(--t3)] font-bold uppercase tracking-wider mt-0.5">Inverter API távoli elérés konfigurálása</div>
                </div>
              </div>
              <span className="text-[10px] bg-white/5 border border-white/10 px-2.5 py-1 rounded-md text-[var(--t3)] font-black uppercase tracking-wider" style={{ marginRight: '15px' }}>Aktiválás ›</span>
            </div>
          </div>
        ) : (
          <div className="gcard fu d1" style={{ 
            marginTop: '15px', 
            marginBottom: '15px',
            padding: '16px',
            background: 'linear-gradient(135deg, var(--backdrop), var(--s1))',
            border: showLiveTelemetry ? '1px solid rgba(46, 209, 88, 0.3)' : '1px solid var(--b1)',
            boxShadow: showLiveTelemetry ? '0 10px 30px rgba(46, 209, 88, 0.08)' : 'none'
          }}>
              {/* Felső információs sáv */}
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center space-x-2">
                  <Icon name="bolt" size={14} color="var(--blue)" strokeWidth={2.5} />
                  <span className="text-xs font-extrabold uppercase tracking-wider text-[var(--t1)]">
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
                  <div className="text-xs text-[var(--t3)] font-medium">
                    Készülék: <span className="text-[var(--t1)] font-bold">{project.inverter_brand} (3-fázis)</span>
                  </div>
                  <button 
                    onClick={() => setShowLiveTelemetry(true)}
                    className="px-3.5 py-1.5 rounded-full font-extrabold text-[10px] uppercase tracking-wider transition-all hover:scale-[1.03]"
                    style={{
                      background: 'var(--s1)',
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
                    <div className="p-3 rounded-md bg-white/[0.02] border border-white/[0.04] flex flex-col justify-between">
                      <span className="text-[9px] font-bold text-[var(--t3)] uppercase tracking-wider">Aktuális erő</span>
                      <div className="flex items-baseline space-x-1 mt-1.5">
                        <span className="text-2xl font-black text-emerald-400 tracking-tight transition-all duration-300">
                          {simulatedPower}
                        </span>
                        <span className="text-xs font-bold text-[var(--t3)]">kW</span>
                      </div>
                      <span className="text-[8px] text-emerald-500/80 font-bold mt-1">● Élő adás a tetőről</span>
                    </div>

                    {/* 2. kártya: Napi összes termelés */}
                    <div className="p-3 rounded-md bg-white/[0.02] border border-white/[0.04] flex flex-col justify-between">
                      <span className="text-[9px] font-bold text-[var(--t3)] uppercase tracking-wider">Mai termelés</span>
                      <div className="flex items-baseline space-x-1 mt-1.5">
                        <span className="text-2xl font-black text-[var(--t1)] tracking-tight">14.82</span>
                        <span className="text-xs font-bold text-[var(--t3)]">kWh</span>
                      </div>
                      <span className="text-[8px] text-[var(--t3)] font-medium mt-1">Összesített napi hozam</span>
                    </div>
                  </div>

                  {/* Grafikon Zóna: Gyönyörű neon-zöld SVG szinusz hullám */}
                  <div className="p-3.5 rounded-md bg-black/20 border border-white/[0.03] relative overflow-hidden">
                    <span className="text-[8px] font-bold text-[var(--t3)] uppercase tracking-wider block mb-2">Termelési görbe (Ma)</span>
                    
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
                    <div className="flex justify-between items-center text-[7px] text-[var(--t3)] font-bold uppercase tracking-wider mt-2.5">
                      <span>06:00 (Napfelkelte)</span>
                      <span className="text-emerald-400 font-extrabold">12:35 (Most)</span>
                      <span>20:00 (Naplemente)</span>
                    </div>
                  </div>

                  {/* Részletek és Összecsukás */}
                  <div className="flex justify-between items-center pt-1">
                    <div className="text-[10px] text-[var(--t3)]">
                      IP: <span className="text-[var(--t2)] font-bold">192.168.1.185</span> · {project.inverter_brand} API v2
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
        )
      )}

      {/* Telegram Csoport Link Gomb */}
      {project?.telegram_link && (
        <div className="gcard fu d1" style={{ padding: 0, border: 'none', background: 'transparent', marginTop: '15px', marginBottom: '15px' }}>
          <a 
            href={project.telegram_link} 
            target="_blank" 
            rel="noreferrer"
            className="w-full font-bold flex items-center justify-center space-x-2 pt-2.5 pb-2.5 text-center text-sm"
            style={{
              background: 'var(--gradient-telegram)',
              borderRadius: '12px',
              color: '#fff',
              border: '1px solid rgba(0, 136, 204, 0.4)',
              boxShadow: '0 8px 25px rgba(0, 136, 204, 0.25)'
            }}
          >
            <Icon name="chat" size={16} color="#fff" strokeWidth={2.2} />
            <span>Közös Telegram Csoport</span>
          </a>
        </div>
      )}



      {/* Archiválás Gomb (Csak ha még nincs lezárva és Admin) */}
      {!project?.archived && isAdmin && (
        <div className="fu d1" style={{ padding: '0 15px', marginTop: '15px', marginBottom: '15px', display: 'flex', justifyContent: 'flex-start' }}>
          <button 
            onClick={handleArchiveProject} 
            className="flex items-center transition-all hover:scale-[1.02] active:scale-98"
            style={{
              background: progressPercent === 100 ? 'var(--gradient-green)' : 'rgba(46, 209, 88, 0.08)',
              borderRadius: '14px',
              height: '52px',
              padding: '0 20px',
              gap: '12px',
              color: progressPercent === 100 ? '#fff' : 'var(--green)',
              border: progressPercent === 100 ? 'none' : '1px solid rgba(46, 209, 88, 0.25)',
              boxShadow: progressPercent === 100 ? '0 8px 25px rgba(46, 209, 88, 0.25)' : 'none',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: '800',
              letterSpacing: '-0.2px'
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
            <span>{progressPercent === 100 ? 'Projekt Lezárása (100% Kész!)' : 'Projekt Lezárása'}</span>
          </button>
        </div>
      )}

      {error && (
        <div className="mx-[15px] mt-4 p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs">
          {error}
        </div>
      )}

      {/* Megrendelő és projekt adatok */}
      <div className="shdr fu d2">
        <div className="shdr-t">Megrendelő és projekt adatai</div>
      </div>

      <div className="gcard fu d2 space-y-6" style={{ background: 'var(--s1)', border: '1px solid var(--b1)', marginBottom: '15px', padding: '24px' }}>
        
        {/* Megrendelő szakasz */}
        <div>
          <div className="text-[10px] text-[var(--t3)] uppercase font-bold tracking-wider mb-1.5">Megrendelő</div>
          <div className="font-extrabold text-[var(--t1)] text-lg">{project?.client_name || 'Nincs megadva'}</div>
        </div>

        {/* Telefonszámok szakasz */}
        <div className="pt-4 border-t border-white/5">
          <div className="text-[10px] text-[var(--t3)] uppercase font-bold tracking-wider mb-2">Telefonszámok</div>
          <div className="flex flex-col space-y-2.5">
            {project?.client_phone && (
              <a href={`tel:${project.client_phone}`} className="font-semibold text-blue-400 hover:underline flex items-center space-x-2 text-sm">
                <Icon name="phone" size={14} strokeWidth={2.2} /> <span>{project.client_phone}</span>
              </a>
            )}
            {project?.client_phone_2 && (
              <a href={`tel:${project.client_phone_2}`} className="font-semibold text-blue-400 hover:underline flex items-center space-x-2 text-sm">
                <Icon name="phone" size={14} strokeWidth={2.2} /> <span>{project.client_phone_2}</span>
              </a>
            )}
            {project?.client_phone_3 && (
              <a href={`tel:${project.client_phone_3}`} className="font-semibold text-blue-400 hover:underline flex items-center space-x-2 text-sm">
                <Icon name="phone" size={14} strokeWidth={2.2} /> <span>{project.client_phone_3}</span>
              </a>
            )}
            {!project?.client_phone && !project?.client_phone_2 && !project?.client_phone_3 && (
              <div className="text-[var(--t3)] italic text-sm">Nincs megadva</div>
            )}
          </div>
        </div>

        {/* Dátumok szakasz */}
        <div className="pt-4 border-t border-white/5 grid grid-cols-2 gap-4">
          <div>
            <div className="text-[10px] text-[var(--t3)] uppercase font-bold tracking-wider mb-1.5">Kezdési Dátum</div>
            <div className="font-semibold text-[var(--t1)] text-sm">{project?.start_time || 'Nincs megadva'}</div>
          </div>
          <div>
            <div className="text-[10px] text-[var(--t3)] uppercase font-bold tracking-wider mb-1.5">Befejezési Dátum</div>
            <div className="font-semibold text-[var(--t1)] text-sm">{project?.end_time || 'Nincs megadva'}</div>
          </div>
        </div>

        {/* Fontos információk toast */}
        {project?.important_info && (
          <div 
            className="flex items-start" 
            style={{ 
              background: 'rgba(255, 159, 10, 0.08)', 
              border: '1px solid rgba(255, 159, 10, 0.25)', 
              color: 'var(--orange)',
              padding: '12px 16px',
              margin: '21px 8px 0 8px',
              borderRadius: '12px',
              gap: '10px',
              fontSize: '13px',
              lineHeight: '1.5'
            }}
          >
            <Icon name="key" size={16} color="var(--orange)" strokeWidth={2.2} />
            <div style={{ flex: 1, wordBreak: 'break-word' }}>
              <span className="font-bold block mb-1" style={{ textTransform: 'uppercase', fontSize: '10px', letterSpacing: '0.05em', color: 'rgba(255, 159, 10, 0.8)' }}>Fontos információ</span>
              {project.important_info}
            </div>
          </div>
        )}
      </div>
      {/* Belső Projekt Chat Szakasz */}
      <div className="shdr fu d2_5">
        <div className="shdr-t" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}><Icon name="chat" size={13} strokeWidth={2.2} /> Belső Projekt Chat</div>
        <div className="shdr-a">{messages.length} üzenet</div>
      </div>

      <div className="gcard fu d2_5 flex flex-col" style={{ background: 'var(--s1)', border: '1px solid var(--b1)', marginBottom: '15px', padding: '18px' }}>
        {/* Üzenetek görgethető doboza */}
        <div 
          ref={chatContainerRef}
          className="custom-scroll"
          style={{ 
            maxHeight: '260px', 
            overflowY: 'auto', 
            minHeight: '120px',
            scrollBehavior: 'smooth',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
            marginBottom: '16px',
            paddingRight: '4px'
          }}
        >
          {messages.length === 0 ? (
            <div className="text-center text-xs text-[var(--t3)] italic my-auto py-6">
              Nincsenek még üzenetek ebben a chatben.<br/>Küldd el az első bejegyzést!
            </div>
          ) : (
            messages.map(msg => {
              const isOwn = msg.user_id === currentUser?.id;
              const senderName = msg.profiles?.full_name || 'Ismeretlen';
              const senderRole = msg.profiles?.role === 'admin' ? 'Admin' : 'Szerelő';
              const senderSerial = msg.profiles?.serial_number ? `[${msg.profiles.serial_number}]` : '';

              return (
                <div 
                  key={msg.id} 
                  className="flex flex-col max-w-[85%] text-xs transition-all"
                  style={{
                    alignSelf: isOwn ? 'flex-end' : 'flex-start',
                    background: isOwn ? 'var(--gradient-telegram)' : 'var(--s1)',
                    border: isOwn ? '1px solid rgba(0, 136, 204, 0.2)' : '1px solid var(--b1)',
                    borderRadius: isOwn ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                    padding: '10px 14px',
                    boxShadow: isOwn ? '0 3px 12px rgba(0, 136, 204, 0.12)' : 'none',
                    color: isOwn ? '#fff' : 'var(--t1)'
                  }}
                >
                  <div className="flex items-center space-x-1.5 mb-1 opacity-80 font-bold text-[9px] uppercase tracking-wider">
                    <span style={{ color: isOwn ? '#fff' : 'var(--blue)' }}>{senderName}</span>
                    <span className="opacity-60">{senderRole} {senderSerial}</span>
                  </div>
                  <div className="whitespace-pre-wrap leading-relaxed">{msg.content}</div>
                  <div className="text-[8px] text-right mt-1.5 opacity-55">
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Üzenet küldő sáv */}
        <form 
          onSubmit={handleSendMessage} 
          className="border-t border-white/5"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            paddingTop: '16px'
          }}
        >
          <input 
            type="text" 
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Írj egy belső üzenetet a csapatnak..."
            disabled={sendingMsg}
            style={{
              background: 'var(--s2)',
              border: '1px solid var(--b1)',
              borderRadius: '12px',
              padding: '0 16px',
              height: '46px',
              color: 'var(--t1)',
              fontSize: '14px',
              width: '100%',
              outline: 'none'
            }}
          />
          <button 
            type="submit" 
            disabled={sendingMsg || !newMessage.trim()}
            className="flex items-center justify-center transition-all disabled:opacity-50 hover:scale-[1.03] active:scale-97"
            style={{ 
              background: 'var(--gradient-green)', 
              color: '#fff',
              border: 'none',
              width: '46px',
              height: '46px',
              cursor: 'pointer',
              borderRadius: '12px',
              boxShadow: '0 4px 15px rgba(46, 209, 88, 0.25)',
              flexShrink: 0
            }}
          >
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              width="16" 
              height="16" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2.5" 
              strokeLinecap="round" 
              strokeLinejoin="round"
              style={{ transform: 'translateX(1px) translateY(-0.5px)' }}
            >
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
            </svg>
          </button>
        </form>
      </div>

      {/* Hiányzó anyagok / Terepi akadályok */}
      <div className="shdr fu d3">
        <div className="shdr-t" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Icon name="warning" size={14} color="var(--yellow)" strokeWidth={2.5} />
          <span>Hiányzó anyagok & Akadályok</span>
        </div>
        {!isEditingMaterials && (
          <button 
            onClick={() => {
              setTempMaterials(project?.missing_materials || '');
              setIsEditingMaterials(true);
            }}
            className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center space-x-1 transition-all hover:bg-white/10 active:scale-95 cursor-pointer"
            style={{ 
              background: 'var(--s2)', 
              border: '1px solid var(--b2)', 
              color: 'var(--t2)'
            }}
          >
            <span>Módosítás</span>
          </button>
        )}
      </div>

      <div className="gcard fu d3" style={{ background: 'var(--s1)', border: '1px solid var(--b1)', marginBottom: '15px', padding: '20px' }}>
        {isEditingMaterials ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <label style={{ display: 'block', fontSize: '9px', color: 'var(--t3)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '2px', textAlign: 'left' }}>
              Sorold fel a hiányzó anyagokat vagy akadályokat (pl. másik cég hibái)
            </label>
            <textarea
              value={tempMaterials}
              onChange={(e) => setTempMaterials(e.target.value)}
              placeholder="Írd le a hiányzó dolgokat ide..."
              rows={3}
              style={{
                background: 'var(--s1)',
                border: '1px solid var(--b1)',
                borderRadius: '10px',
                padding: '7px 12px',
                color: 'var(--t1)',
                fontSize: '13px',
                width: '100%',
                outline: 'none',
                resize: 'none'
              }}
            />
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '4px' }}>
              <button
                onClick={() => setIsEditingMaterials(false)}
                className="px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all hover:bg-white/5 cursor-pointer"
                style={{
                  background: 'var(--s2)',
                  border: '1px solid var(--b1)',
                  color: 'var(--t2)'
                }}
              >
                Mégse
              </button>
              <button
                onClick={handleSaveMaterials}
                className="px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all hover:scale-[1.02] cursor-pointer"
                style={{
                  background: 'var(--gradient-blue)',
                  border: 'none',
                  color: '#fff',
                  boxShadow: '0 4px 15px rgba(79, 142, 247, 0.25)'
                }}
              >
                Mentés
              </button>
            </div>
          </div>
        ) : (
          <div>
            {project?.missing_materials ? (
              <div 
                style={{ 
                  fontSize: '13px', 
                  color: 'var(--t1)', 
                  whiteSpace: 'pre-wrap', 
                  lineHeight: '1.5',
                  paddingLeft: '10px',
                  borderLeft: '3px solid var(--yellow)'
                }}
              >
                {project.missing_materials}
              </div>
            ) : (
              <div className="text-center text-xs text-[var(--t3)] italic py-2">
                Nincs jelentett hiányzó anyag vagy terepi akadály.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Feladatlista Teendők */}
      <div className="shdr fu d3">
        <div className="shdr-t">Teendők / Munkalap</div>
        <div className="shdr-a">{completedTasks.length}/{tasks.length} kész</div>
      </div>

      <div className="gcard fu d3" style={{ background: 'var(--s1)', border: '1px solid var(--b1)', marginBottom: '15px', padding: '20px' }}>
        {tasks.length === 0 ? (
          <div className="text-center text-xs text-[var(--t3)] italic py-4">
            Ehhez a projekthez nincs feladatlista megadva.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {tasks.map((task, idx) => {
              const isDone = completedTasks.includes(task);
              return (
                <div 
                  key={idx} 
                  className="flex items-start cursor-pointer transition-all active:scale-[0.98]" 
                  onClick={() => handleToggleTask(task)}
                  style={{ gap: '12px' }}
                >
                  {/* Kör alakú prémium checkbox */}
                  <div 
                    className="flex-shrink-0 transition-all flex items-center justify-center"
                    style={{
                      width: '22px',
                      height: '22px',
                      borderRadius: '50%',
                      border: isDone ? 'none' : '1.5px solid var(--b2)',
                      background: isDone ? 'var(--gradient-green)' : 'var(--s1)',
                      boxShadow: isDone ? '0 3px 8px rgba(46, 209, 88, 0.2)' : 'none'
                    }}
                  >
                    {isDone && (
                      <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                    )}
                  </div>
                  
                  {/* Feladat szöveg */}
                  <span 
                    className="text-sm font-medium transition-all"
                    style={{
                      color: isDone ? 'var(--t3)' : 'var(--t1)',
                      textDecoration: isDone ? 'line-through' : 'none',
                      flex: 1,
                      wordBreak: 'break-word',
                      lineHeight: '1.4',
                      paddingTop: '1px'
                    }}
                  >
                    {task}
                  </span>
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
      <div className="fu d4 flex justify-center" style={{ marginBottom: '20px', width: '100%' }}>
        <style>{`
          @keyframes subtle-breathe {
            0% {
              transform: scale(1);
              box-shadow: 0 4px 15px rgba(0, 136, 204, 0.25);
            }
            50% {
              transform: scale(1.025);
              box-shadow: 0 8px 24px rgba(0, 136, 204, 0.45);
            }
            100% {
              transform: scale(1);
              box-shadow: 0 4px 15px rgba(0, 136, 204, 0.25);
            }
          }
          .breathe-btn {
            animation: subtle-breathe 2.8s ease-in-out infinite;
          }
          .breathe-btn:active {
            transform: scale(0.95) !important;
            animation: none !important;
          }
        `}</style>
        <label 
          className="breathe-btn cursor-pointer transition-all flex items-center justify-center" 
          style={{ 
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: 'var(--gradient-telegram)', 
            border: 'none', 
            borderRadius: '23px',
            height: '46px',
            padding: '0 24px',
            color: '#ffffff',
            fontSize: '13px',
            fontWeight: '700',
            cursor: 'pointer'
          }}
        >
          <input 
            type="file" 
            accept="image/*" 
            onChange={handlePhotoSelected} 
            disabled={uploading}
            className="hidden" 
          />
          {uploading ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white border-t-transparent"></div>
              <span style={{ fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Feltöltés...</span>
            </div>
          ) : (
            <>
              {/* SVG Camera Icon */}
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                width="16" 
                height="16" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2.5" 
                strokeLinecap="round" 
                strokeLinejoin="round"
                style={{ flexShrink: 0, color: '#ffffff' }}
              >
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                <circle cx="12" cy="13" r="4"></circle>
              </svg>
              <span>Fénykép készítése</span>
            </>
          )}
        </label>
      </div>

      {/* KÉPFELTÖLTÉSI VARÁZSLÓ MODAL (Apple-stílusú overlay) */}
      {selectedFile && (
        <div 
          className="fixed inset-0 z-[1000] flex items-center justify-center p-4 overflow-y-auto" 
          style={{ 
            background: 'var(--backdrop)', 
            backdropFilter: 'blur(25px)', 
            WebkitBackdropFilter: 'blur(25px)' 
          }}
        >
          <div 
            className="w-full max-w-sm animate-[scaleUp_0.25s_ease-out]" 
            style={{ 
              background: 'var(--s1)', 
              border: '1px solid var(--b1)', 
              borderRadius: '24px', 
              boxShadow: 'var(--shadow-strong)',
              backdropFilter: 'blur(30px)',
              WebkitBackdropFilter: 'blur(30px)',
              maxHeight: 'calc(100vh - 32px)',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            {/* Modal Fejléc */}
            <div className="p-5 pb-2 flex justify-between items-center flex-shrink-0">
              <span className="text-sm font-bold text-[var(--t1)]" style={{ fontSize: '15px', fontWeight: '800', letterSpacing: '-0.3px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}><Icon name="camera" size={16} strokeWidth={2.2} /> Fénykép ellenőrzése</span>
              <button 
                type="button" 
                onClick={cancelPhotoUpload} 
                className="w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-95 hover:bg-white/10"
                style={{ 
                  background: 'var(--s1)', 
                  border: '1px solid var(--b1)', 
                  color: 'var(--t2)', 
                  cursor: 'pointer' 
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>

            <form onSubmit={submitPhotoUpload} className="p-5 pt-2" style={{ display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto', flex: 1 }}>
              {/* Fotó előnézet fehér hajszálvékony kerettel */}
              {filePreview && (
                <div 
                  className="w-full aspect-video rounded-xl"
                  style={{
                    backgroundImage: `url(${filePreview})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    border: '1px solid var(--b2)',
                    boxShadow: 'var(--shadow-soft)',
                    aspectRatio: '16 / 9'
                  }}
                />
              )}

              {/* TÍPUS KIVÁLASZTÁSA (2 hatalmas, gyönyörű Apple kártya egymás mellett) */}
              <div>
                <div className="grid grid-cols-2 gap-3">
                  {/* Kártya 1: Munkafolyamat */}
                  <div 
                    onClick={() => setIsIssue(false)}
                    className="p-3.5 rounded-2xl cursor-pointer flex flex-col items-center justify-center space-y-1.5 transition-all active:scale-95"
                    style={{
                      background: !isIssue ? 'rgba(46, 209, 88, 0.04)' : 'var(--s1)',
                      border: !isIssue ? '2px solid var(--green)' : '1px solid var(--b1)',
                      boxShadow: !isIssue ? '0 8px 20px rgba(46, 209, 88, 0.12)' : 'none'
                    }}
                  >
                    <Icon name="dot-green" size={18} />
                    <span className="text-[11px] font-bold text-[var(--t1)]">Munkafolyamat</span>
                  </div>

                  {/* Kártya 2: Hiba */}
                  <div 
                    onClick={() => setIsIssue(true)}
                    className="p-3.5 rounded-2xl cursor-pointer flex flex-col items-center justify-center space-y-1.5 transition-all active:scale-95"
                    style={{
                      background: isIssue ? 'rgba(255, 59, 48, 0.04)' : 'var(--s1)',
                      border: isIssue ? '2px solid var(--red)' : '1px solid var(--b1)',
                      boxShadow: isIssue ? '0 8px 20px rgba(255, 59, 48, 0.12)' : 'none'
                    }}
                  >
                    <Icon name="warning" size={18} color="var(--red)" strokeWidth={2.2} />
                    <span className="text-[11px] font-bold text-[var(--t1)]">Hiba / Akadály</span>
                  </div>
                </div>
              </div>

              {/* MEGJEGYZÉS (Textarea, ha hiba, akkor KÖTELEZŐ) */}
              <div>
                <label className="text-[10px] text-[var(--t3)] uppercase font-bold tracking-wider block" style={{ marginBottom: '4px', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                  {isIssue ? (<><Icon name="dot-red" size={10} /> Probléma leírása (KÖTELEZŐ)</>) : 'Megjegyzés a képhez (Opcionális)'}
                </label>
                <textarea 
                  value={photoComment} 
                  onChange={(e) => setPhotoComment(e.target.value)}
                  required={isIssue}
                  rows="3"
                  placeholder={isIssue ? "pl. Törött a napelem sarka..." : "pl. Sínek felszerelve a tetőre..."}
                  style={{
                    background: 'var(--s1)',
                    border: isIssue && !photoComment.trim() ? '1px solid rgba(255, 59, 48, 0.5)' : '1px solid var(--b1)',
                    borderRadius: '14px',
                    padding: '12px 14px',
                    color: 'var(--t1)',
                    fontSize: '13px',
                    width: '100%',
                    outline: 'none',
                    fontFamily: 'inherit',
                    resize: 'none'
                  }}
                />
              </div>

              {/* AKCIÓ GOMBOK (Egységesítve az EditProjectModal dizájnnal: magasság 56px, lekerekítés 16px, gap 10px) */}
              <div style={{ display: 'flex', gap: '10px', paddingTop: '8px' }}>
                <button 
                  type="button" 
                  onClick={cancelPhotoUpload} 
                  className="flex-1 font-bold transition-all active:scale-95 flex items-center justify-center"
                  style={{ 
                    background: 'var(--s2)', 
                    color: 'var(--t1)', 
                    border: '1px solid var(--b1)',
                    borderRadius: '16px',
                    height: '56px',
                    fontSize: '14px',
                    cursor: 'pointer'
                  }}
                >
                  Mégsem
                </button>
                <button 
                  type="submit" 
                  disabled={uploading}
                  className="flex-1 font-bold transition-all active:scale-95 flex items-center justify-center premium-breathe"
                  style={{
                    background: isIssue 
                      ? 'var(--gradient-red)' 
                      : 'var(--gradient-green)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '16px',
                    height: '56px',
                    fontSize: '14px',
                    cursor: 'pointer',
                    boxShadow: isIssue 
                      ? '0 8px 25px rgba(255, 59, 48, 0.35)' 
                      : '0 8px 25px rgba(46, 209, 88, 0.35)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  {uploading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                      <span>Küldés...</span>
                    </>
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="22" y1="2" x2="11" y2="13"></line>
                        <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                      </svg>
                      <span>Fotó Beküldése</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Galéria Rács (Modern 2-oszlopos Kártyarendszer megjegyzésekkel) */}
      <div className="gcard mt-4 fu d5" style={{ padding: 0, border: 'none', background: 'transparent' }}>
        {photos.length === 0 ? (
          <div className="text-center text-xs text-[var(--t3)] italic py-6" style={{ background: 'var(--s1)', border: '1px solid var(--b1)', borderRadius: '20px' }}>
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
                  className="overflow-hidden flex flex-col relative"
                  style={{
                    background: 'var(--s1)',
                    border: photo.resolved 
                      ? '1px solid rgba(46, 209, 88, 0.4)' 
                      : (photo.is_issue ? '1px solid rgba(255, 59, 48, 0.4)' : '1px solid var(--b1)'),
                    borderRadius: '14px',
                    backdropFilter: 'blur(8px)',
                    WebkitBackdropFilter: 'blur(8px)'
                  }}
                >
                  {/* Kép kattintható változata nagyban megnyitáshoz (in-app overlay) */}
                  <div
                    onClick={() => setPreviewImage({ ...photo, is_verification: false })}
                    className="block aspect-video relative cursor-pointer"
                    style={{
                      backgroundImage: `url(${photo.file_path})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      aspectRatio: '4 / 3',
                      borderBottom: '1px solid var(--b2)'
                    }}
                  >
                    {/* Hiba vs Munkafolyamat Jelvény ráúsztatva a képre */}
                    <div 
                      className="absolute top-2.5 left-2.5 rounded-full text-[9px] font-black uppercase tracking-wider text-white" 
                      style={{
                        background: photo.resolved 
                          ? 'rgba(46, 209, 88, 0.95)' 
                          : (photo.is_issue ? 'rgba(255, 59, 48, 0.95)' : 'rgba(46, 209, 88, 0.9)'),
                        border: photo.resolved
                          ? '1px solid rgba(46, 209, 88, 0.3)'
                          : (photo.is_issue ? '1px solid rgba(255, 59, 48, 0.3)' : '1px solid rgba(46, 209, 88, 0.2)'),
                        backdropFilter: 'blur(10px)',
                        WebkitBackdropFilter: 'blur(10px)',
                        padding: '3.5px 8px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        whiteSpace: 'nowrap',
                        boxShadow: 'var(--shadow-soft)',
                        lineHeight: '1'
                      }}
                    >
                      {photo.is_issue && !photo.resolved
                        ? <Icon name="warning" size={9} color="var(--red)" strokeWidth={2.5} />
                        : <Icon name="dot-green" size={9} />}
                      <span style={{ fontSize: '8px' }}>{photo.resolved ? 'Kijavítva' : (photo.is_issue ? 'Hiba' : 'Kész')}</span>
                    </div>
                  </div>
                  
                  {/* Kártya alsó rész: Feltöltő + Időpont + Megjegyzés */}
                  <div className="p-2.5 flex flex-col space-y-1 text-[11px] leading-tight">
                    <div className="flex justify-between items-center text-[9px] text-[var(--t3)] font-semibold uppercase tracking-wider">
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><Icon name="worker" size={10} color="var(--t3)" strokeWidth={2} /> {photo.profiles?.full_name || 'Szerelő'}</span>
                    </div>
                    <div className="text-[9px] text-[var(--t3)]">{formattedDate}</div>
                    
                    {photo.description ? (
                      <div className="text-xs font-medium italic mt-1.5 p-1.5 rounded-lg border leading-snug" style={{ 
                        background: photo.resolved 
                          ? 'rgba(46, 209, 88, 0.05)' 
                          : (photo.is_issue ? 'rgba(255, 59, 48, 0.08)' : 'var(--s1)'), 
                        borderColor: photo.resolved 
                          ? 'rgba(46, 209, 88, 0.15)' 
                          : (photo.is_issue ? 'rgba(255, 59, 48, 0.15)' : 'var(--b1)'),
                        color: photo.resolved 
                          ? 'var(--green)' 
                          : (photo.is_issue ? 'var(--red)' : 'var(--t1)')
                      }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}><Icon name="chat" size={11} strokeWidth={2.2} /> {photo.description}</span>
                      </div>
                    ) : (
                      <div className="text-[10px] text-[var(--t3)] italic mt-1">Nincs leírás</div>
                    )}

                    {/* JAVÍTÁS KÉPE ÉS LEÍRÁSA (Ha van) */}
                    {photo.resolved && (
                      <div className="mt-2 pt-2 border-t border-white/5 space-y-1.5">
                        <div className="text-[9px] text-emerald-400 font-extrabold uppercase tracking-wider" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><Icon name="check-circle" size={10} color="var(--green)" strokeWidth={2.5} /> Javítás Igazolása:</div>
                        {photo.resolved_file_path && (
                          <div 
                            onClick={() => setPreviewImage({
                              ...photo,
                              file_path: photo.resolved_file_path,
                              description: photo.resolved_comment || 'Sikeresen javítva.',
                              created_at: photo.resolved_at || photo.created_at,
                              is_verification: true
                            })}
                            className="block aspect-video rounded-lg overflow-hidden relative cursor-pointer"
                            style={{
                              backgroundImage: `url(${photo.resolved_file_path})`,
                              backgroundSize: 'cover',
                              backgroundPosition: 'center',
                              aspectRatio: '16 / 9',
                              border: '1px solid var(--b2)'
                            }}
                          >
                            <div 
                              className="absolute bottom-1.5 right-1.5 rounded text-[8px] text-white font-black uppercase tracking-wider"
                              style={{
                                background: 'rgba(46, 209, 88, 0.95)',
                                border: '1px solid rgba(46, 209, 88, 0.3)',
                                backdropFilter: 'blur(4px)',
                                WebkitBackdropFilter: 'blur(4px)',
                                padding: '2px 6px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                                whiteSpace: 'nowrap',
                                boxShadow: 'var(--shadow-soft)',
                                lineHeight: '1'
                              }}
                            >
                              <Icon name="search" size={9} color="#fff" strokeWidth={2.5} /> Nagyítás
                            </div>
                          </div>
                        )}
                        <div className="text-[10px] text-[var(--t2)] italic p-1.5 rounded-lg bg-emerald-500/5 border border-emerald-500/10 leading-snug" style={{ display: 'flex', alignItems: 'flex-start', gap: '5px' }}>
                          <Icon name="tool" size={11} color="var(--green)" strokeWidth={2.2} style={{ marginTop: '2px' }} />
                          <span>{photo.resolved_comment || 'Sikeresen javítva.'}</span>
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

      {/* Digitális Aláírás Szekció */}
      {FEATURE_FLAGS.CLIENT_SIGNATURE && project && (
        <div className="gcard fu d5" style={{ marginTop: '20px', padding: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--t1)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Icon name="check" size={13} color="var(--blue)" strokeWidth={2.5} />
              <span>Megrendelői átvétel / Aláírás</span>
            </div>
            {project.client_signature && (
              <span className="pill p-ok" style={{ fontSize: '9px' }}>Aláírva</span>
            )}
          </div>

          {project.client_signature ? (
            <div>
              <div style={{ 
                background: '#ffffff', 
                border: '1px solid var(--b1)', 
                borderRadius: '10px', 
                padding: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100px',
                marginBottom: '10px'
              }}>
                <img 
                  src={project.client_signature} 
                  alt="Aláírás" 
                  style={{ maxHeight: '80px', objectFit: 'contain' }} 
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--t1)' }}>{project.client_signature_name}</div>
                  <div style={{ fontSize: '10px', color: 'var(--t3)', marginTop: '2px' }}>
                    Dátum: {new Date(project.client_signature_date).toLocaleString('hu-HU')}
                  </div>
                </div>
                <button
                  onClick={handleDeleteSignature}
                  style={{
                    background: 'rgba(255, 59, 48, 0.1)',
                    border: '1px solid rgba(255, 59, 48, 0.2)',
                    color: 'var(--red)',
                    borderRadius: '8px',
                    padding: '6px 12px',
                    fontSize: '11px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  Törlés
                </button>
              </div>
            </div>
          ) : (
            <div>
              <p style={{ fontSize: '12px', color: 'var(--t3)', marginBottom: '14px', lineHeight: '1.4' }}>
                A munkalap lezárásához és átvételéhez a megrendelő digitálisan aláírhatja a projektet közvetlenül a képernyőn.
              </p>
              <button
                onClick={() => setIsSignatureModalOpen(true)}
                className="w-full font-bold flex items-center justify-center space-x-2 pt-2.5 pb-2.5 text-center text-sm transition-all hover:scale-[1.01] active:scale-[0.99]"
                style={{
                  background: 'rgba(79, 142, 247, 0.12)',
                  borderRadius: '12px',
                  color: 'var(--blue)',
                  border: '1px solid rgba(79, 142, 247, 0.25)',
                  boxShadow: 'var(--shadow-soft)',
                  cursor: 'pointer'
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 20h9"/>
                  <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
                </svg>
                <span>Aláírás rögzítése</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Ügyfél Visszajelzés Szekció */}
      {FEATURE_FLAGS.CLIENT_FEEDBACK && project && (
        <div className="gcard fu d5" style={{ marginTop: '20px', padding: '16px', marginBottom: '25px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--t1)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Icon name="check" size={13} color="var(--yellow)" strokeWidth={2.5} />
              <span>Ügyfél visszajelzése</span>
            </div>
            {review && (
              <span className="pill p-ok" style={{ fontSize: '9px', background: 'rgba(255, 214, 10, 0.12)', color: 'var(--yellow)' }}>Leadva</span>
            )}
          </div>

          {review ? (
            <div>
              {/* Csillagok megjelenítése */}
              <div style={{ display: 'flex', gap: '4px', marginBottom: '10px' }}>
                {[1, 2, 3, 4, 5].map((starIdx) => {
                  const isFilled = starIdx <= review.rating;
                  return (
                    <svg
                      key={starIdx}
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill={isFilled ? 'var(--yellow)' : 'none'}
                      stroke={isFilled ? 'var(--yellow)' : 'rgba(255,255,255,0.2)'}
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{
                        filter: isFilled ? 'drop-shadow(0 0 4px rgba(255, 214, 10, 0.3))' : 'none'
                      }}
                    >
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                    </svg>
                  );
                })}
              </div>
              
              {review.comment ? (
                <p style={{ 
                  fontSize: '12.5px', 
                  color: 'var(--t2)', 
                  lineHeight: '1.45', 
                  background: 'rgba(255,255,255,0.02)', 
                  border: '1px solid var(--b1)', 
                  borderRadius: '10px', 
                  padding: '10px',
                  marginBottom: '6px'
                }}>
                  "{review.comment}"
                </p>
              ) : (
                <p style={{ fontSize: '12px', color: 'var(--t3)', fontStyle: 'italic', marginBottom: '6px' }}>
                  Nem érkezett szöveges vélemény.
                </p>
              )}

              <div style={{ fontSize: '10px', color: 'var(--t3)', textAlign: 'right' }}>
                Beküldve: {new Date(review.created_at).toLocaleString('hu-HU')}
              </div>
            </div>
          ) : (
            <div>
              <p style={{ fontSize: '12px', color: 'var(--t3)', marginBottom: '14px', lineHeight: '1.4' }}>
                Küldj el egy nyilvános linket a megrendelőnek, ahol értékelheti a munka minőségét.
              </p>
              <button
                onClick={() => {
                  const url = `${window.location.origin}/feedback/${id}`;
                  navigator.clipboard.writeText(url)
                    .then(() => alert('Értékelési link sikeresen másolva a vágólapra!'))
                    .catch(() => alert('Sikertelen másolás, a link: ' + url));
                }}
                className="w-full font-bold flex items-center justify-center space-x-2 pt-2.5 pb-2.5 text-center text-sm transition-all hover:scale-[1.01] active:scale-[0.99]"
                style={{
                  background: 'rgba(255, 214, 10, 0.08)',
                  borderRadius: '12px',
                  color: 'var(--yellow)',
                  border: '1px solid rgba(255, 214, 10, 0.25)',
                  boxShadow: 'var(--shadow-soft)',
                  cursor: 'pointer'
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                </svg>
                <span>Értékelési link másolása</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* IN-APP APPLE STÍLUSÚ IMMERZÍV FÉNYKÉP NÉZEGETŐ OVERLAY */}
      {previewImage && createPortal(
        <div
          className="fixed inset-0 z-[2000] overflow-hidden"
          style={{
            background: 'var(--backdrop)',
            backdropFilter: 'blur(25px)',
            WebkitBackdropFilter: 'blur(25px)',
            animation: 'fadeIn 0.25s ease-out'
          }}
        >
          {/* Görgethető tartalom zóna */}
          <div
            className="absolute inset-0 overflow-y-auto"
            style={{
              WebkitOverflowScrolling: 'touch',
              overscrollBehavior: 'contain',
              padding: 'calc(80px + env(safe-area-inset-top)) 16px calc(32px + env(safe-area-inset-bottom))'
            }}
          >
            <div className="flex flex-col items-center justify-start w-full min-h-full" style={{ gap: '20px' }}>
              {/* Immerzív kép - keret nélkül, önmagában lebegő árnyékkal */}
              <div 
                className="w-full max-w-2xl flex flex-col items-center justify-center relative" 
                style={{ flexShrink: 0 }}
              >
                {/* Scrollable image container */}
                <div 
                  ref={imageContainerRef}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUpOrLeave}
                  onMouseLeave={handleMouseUpOrLeave}
                  className="w-full select-none"
                  style={{
                    maxHeight: '70dvh',
                    overflow: zoomScale === 1 ? 'hidden' : 'auto',
                    borderRadius: '16px',
                    border: '1px solid var(--b2)',
                    boxShadow: 'var(--shadow-strong)',
                    background: 'rgba(0,0,0,0.3)',
                    display: 'flex',
                    alignItems: zoomScale === 1 ? 'center' : 'flex-start',
                    justifyContent: zoomScale === 1 ? 'center' : 'flex-start',
                    position: 'relative',
                    cursor: zoomScale === 1 ? 'zoom-in' : (isDragging ? 'grabbing' : 'grab')
                  }}
                >
                  <img
                    src={previewImage.file_path}
                    alt={previewImage.description || 'Fénykép'}
                    draggable="false"
                    style={{
                      width: zoomScale === 1 ? 'auto' : `${zoomScale * 100}%`,
                      height: 'auto',
                      maxWidth: zoomScale === 1 ? '100%' : 'none',
                      maxHeight: zoomScale === 1 ? '70dvh' : 'none',
                      objectFit: 'contain',
                      borderRadius: zoomScale === 1 ? '16px' : '0px',
                      transform: `rotate(${rotation}deg)`,
                      transition: isDragging ? 'none' : 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                      margin: 'auto',
                      pointerEvents: 'auto'
                    }}
                    onClick={(e) => {
                      if (zoomScale > 1 && hasMoved) {
                        return; // Prevent click-to-zoom-out if user dragged to pan
                      }
                      setZoomScale(zoomScale === 1 ? 2 : 1);
                    }}
                  />
                </div>
                
                {/* Lebegő Nagyító Kezelőszervek (Floating Zoom Controls) */}
                <div 
                  style={{
                    position: 'absolute',
                    bottom: '16px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: 'rgba(7, 9, 15, 0.85)',
                    backdropFilter: 'blur(12px)',
                    WebkitBackdropFilter: 'blur(12px)',
                    border: '1px solid var(--b2)',
                    borderRadius: '24px',
                    padding: '4px 10px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                    zIndex: 10
                  }}
                  onClick={(e) => e.stopPropagation()} // Stop modal closure or image clicks
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setZoomScale(prev => Math.max(1, prev - 0.5));
                    }}
                    disabled={zoomScale <= 1}
                    className="transition-all hover:bg-white/10 active:scale-90"
                    style={{
                      background: 'none',
                      border: 'none',
                      color: zoomScale <= 1 ? 'var(--t3)' : '#fff',
                      cursor: zoomScale <= 1 ? 'not-allowed' : 'pointer',
                      fontWeight: '800',
                      fontSize: '15px',
                      width: '24px',
                      height: '24px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: '50%'
                    }}
                    title="Kicsinyítés"
                  >
                    —
                  </button>
                  
                  <span 
                    style={{ 
                      fontSize: '11px', 
                      color: '#fff', 
                      fontWeight: '800', 
                      fontFamily: 'monospace',
                      minWidth: '40px',
                      textAlign: 'center'
                    }}
                  >
                    {Math.round(zoomScale * 100)}%
                  </span>
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setZoomScale(prev => Math.min(3, prev + 0.5));
                    }}
                    disabled={zoomScale >= 3}
                    className="transition-all hover:bg-white/10 active:scale-90"
                    style={{
                      background: 'none',
                      border: 'none',
                      color: zoomScale >= 3 ? 'var(--t3)' : '#fff',
                      cursor: zoomScale >= 3 ? 'not-allowed' : 'pointer',
                      fontWeight: '800',
                      fontSize: '15px',
                      width: '24px',
                      height: '24px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: '50%'
                    }}
                    title="Nagyítás"
                  >
                    +
                  </button>

                  {zoomScale !== 1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setZoomScale(1);
                      }}
                      className="transition-all hover:bg-white/20 active:scale-95"
                      style={{
                        background: 'rgba(255,255,255,0.1)',
                        border: 'none',
                        color: '#fff',
                        cursor: 'pointer',
                        fontSize: '9px',
                        fontWeight: '800',
                        padding: '3px 8px',
                        borderRadius: '12px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        marginLeft: '4px'
                      }}
                    >
                      Alaphelyzet
                    </button>
                  )}
                </div>
              </div>

              {/* Alsó Adatlap Kártya (Információk a képről) */}
              <div
                className="w-full max-w-md p-4 rounded-xl flex flex-col space-y-2 text-left transition-all"
                style={{
                  background: 'var(--s1)',
                  border: '1px solid var(--b1)',
                  borderLeft: previewImage.is_verification || previewImage.resolved
                    ? '4px solid var(--green)'
                    : (previewImage.is_issue ? '4px solid var(--red)' : '4px solid var(--blue)'),
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                  boxShadow: 'var(--shadow-soft)',
                  flexShrink: 0
                }}
              >
                <div className="flex justify-between items-center text-[10px] text-[var(--t3)] font-black uppercase tracking-wider" style={{ borderBottom: '1px solid var(--b1)', paddingBottom: '6px' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}><Icon name="worker" size={11} color="var(--t3)" strokeWidth={2} /> Feltöltötte: {previewImage.profiles?.full_name || 'Dolgozó'}</span>
                  <span>{previewImage.created_at && new Date(previewImage.created_at).toLocaleDateString('hu-HU', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}</span>
                </div>
                
                {previewImage.description ? (
                  <div className="text-xs font-semibold text-[var(--t1)] leading-snug pt-1" style={{ letterSpacing: '0.01em', display: 'flex', alignItems: 'flex-start', gap: '5px' }}>
                    <Icon name="chat" size={13} color="var(--t1)" strokeWidth={2.2} style={{ marginTop: '2px' }} />
                    <span>{previewImage.description}</span>
                  </div>
                ) : (
                  <div className="text-xs text-[var(--t3)] italic pt-1">Nincs megjegyzés ehhez a képhez.</div>
                )}

                {previewImage.is_verification && (
                  <div className="text-[9px] text-emerald-400 font-extrabold uppercase tracking-wider pt-1 flex items-center gap-1">
                    <Icon name="shield" size={10} color="var(--green)" strokeWidth={2.2} /> Ez a fotó az eredeti hibajelentés sikeres javítását igazolja.
                  </div>
                )}

                {isAdmin && (
                  <div style={{ paddingTop: '8px', borderTop: '1px solid var(--b1)', marginTop: '8px', display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        if (window.confirm("Biztosan törölni szeretnéd ezt a fényképet? Ez a művelet nem vonható vissza.")) {
                          await handleDeletePhoto(previewImage);
                        }
                      }}
                      className="px-3 py-1.5 rounded-md text-[11px] font-extrabold flex items-center space-x-1 transition-all hover:bg-red-500/20 active:scale-95 cursor-pointer"
                      style={{
                        background: 'rgba(255, 59, 48, 0.12)',
                        border: '1px solid rgba(255, 59, 48, 0.25)',
                        color: 'var(--red)'
                      }}
                    >
                      <Icon name="trash" size={12} color="var(--red)" strokeWidth={2.5} style={{ marginRight: '4px' }} />
                      <span>Kép törlése</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Felső Navigációs és státusz sáv (Rögzített a görgetőn kívül, így mindig kattintható!) */}
          <div className="fixed left-5 right-5 flex justify-between items-center gap-2 z-[2010]" style={{ top: 'calc(20px + env(safe-area-inset-top))' }}>
            <div className="flex items-center flex-wrap" style={{ gap: '6px' }}>
              <button 
                onClick={() => setPreviewImage(null)}
                className="px-4 py-2.5 font-extrabold text-sm flex items-center space-x-1.5 transition-all hover:bg-white/10 active:scale-95 cursor-pointer"
                style={{ 
                  background: 'var(--s2)', 
                  border: '1px solid var(--b2)', 
                  color: 'var(--t1)',
                  borderRadius: '10px',
                  flexShrink: 0,
                  whiteSpace: 'nowrap'
                }}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><Icon name="close" size={14} strokeWidth={2.5} /> Bezárás</span>
              </button>

              <button 
                onClick={() => setRotation(prev => (prev + 90) % 360)}
                className="px-4 py-2.5 font-extrabold text-sm flex items-center space-x-1.5 transition-all hover:bg-white/10 active:scale-95 cursor-pointer"
                style={{ 
                  background: 'var(--s2)', 
                  border: '1px solid var(--b2)', 
                  color: 'var(--t1)',
                  borderRadius: '10px',
                  flexShrink: 0,
                  whiteSpace: 'nowrap'
                }}
                title="Kép forgatása 90 fokkal"
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
                    <polyline points="23 4 23 10 17 10"></polyline>
                    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
                  </svg>
                  Forgatás
                </span>
              </button>

              <button 
                onClick={() => handleDownloadPhoto(previewImage.file_path, `voltdesk-foto-${previewImage.id || Date.now()}.jpg`)}
                className="px-4 py-2.5 font-extrabold text-sm flex items-center space-x-1.5 transition-all hover:bg-white/10 active:scale-95 cursor-pointer"
                style={{ 
                  background: 'var(--s2)', 
                  border: '1px solid var(--b2)', 
                  color: 'var(--t1)',
                  borderRadius: '10px',
                  flexShrink: 0,
                  whiteSpace: 'nowrap'
                }}
                title="Kép letöltése"
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><Icon name="download" size={14} strokeWidth={2.5} /> Letöltés</span>
              </button>
            </div>
            
            {/* Dinamikus kép státusz toaszt */}
            <div 
              className="rounded-full text-[9px] font-black uppercase tracking-wider text-white" 
              style={{
                background: previewImage.is_verification
                  ? 'rgba(46, 209, 88, 0.95)' 
                  : (previewImage.resolved 
                      ? 'rgba(46, 209, 88, 0.95)' 
                      : (previewImage.is_issue ? 'rgba(255, 59, 48, 0.95)' : 'rgba(79, 142, 247, 0.9)')),
                border: previewImage.is_verification || previewImage.resolved
                  ? '1px solid rgba(46, 209, 88, 0.3)'
                  : (previewImage.is_issue ? '1px solid rgba(255, 59, 48, 0.3)' : '1px solid rgba(79, 142, 247, 0.3)'),
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                padding: '5px 12px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                whiteSpace: 'nowrap',
                boxShadow: 'var(--shadow-soft)',
                lineHeight: '1'
              }}
            >
              {previewImage.is_verification
                ? <Icon name="check-circle" size={11} color="#fff" strokeWidth={2.5} />
                : (previewImage.resolved
                    ? <Icon name="dot-green" size={10} />
                    : (previewImage.is_issue
                        ? <Icon name="warning" size={11} color="#fff" strokeWidth={2.5} />
                        : <Icon name="clock" size={11} color="#fff" strokeWidth={2.2} />))}
              <span>
                {previewImage.is_verification 
                  ? 'Javítás Igazolása' 
                  : (previewImage.resolved ? 'Kijavítva' : (previewImage.is_issue ? 'Hiba' : 'Kész'))}
              </span>
            </div>
          </div>

          {/* Navigációs nyilak (Galéria léptetés - mindig láthatóak, 1 kép esetén letiltva) */}
          {(() => {
            const hasMultiple = getViewablePhotos().length > 1;
            return (
              <>
                {/* Bal nyíl */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (hasMultiple) handlePrevPhoto();
                  }}
                  disabled={!hasMultiple}
                  className="gallery-nav-arrow fixed left-4 top-1/2 -translate-y-1/2 z-[2015] w-10 h-10 rounded-full flex items-center justify-center transition-all active:scale-90"
                  style={{
                    opacity: hasMultiple ? 1 : 0.4,
                    cursor: hasMultiple ? 'pointer' : 'not-allowed'
                  }}
                  title="Előző kép"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="15 18 9 12 15 6"></polyline>
                  </svg>
                </button>

                {/* Jobb nyíl */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (hasMultiple) handleNextPhoto();
                  }}
                  disabled={!hasMultiple}
                  className="gallery-nav-arrow fixed right-4 top-1/2 -translate-y-1/2 z-[2015] w-10 h-10 rounded-full flex items-center justify-center transition-all active:scale-90"
                  style={{
                    opacity: hasMultiple ? 1 : 0.4,
                    cursor: hasMultiple ? 'pointer' : 'not-allowed'
                  }}
                  title="Következő kép"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6"></polyline>
                  </svg>
                </button>
              </>
            );
          })()}
        </div>,
        document.body
      )}

      {/* PDF EXPORT LOADING OVERLAY */}
      {pdfExporting && createPortal(
        <div
          className="fixed inset-0 z-[3000] flex items-center justify-center"
          style={{
            background: 'var(--backdrop)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)'
          }}
        >
          <div
            className="flex flex-col items-center space-y-5 p-8 rounded-2xl"
            style={{
              background: 'var(--s1)',
              border: '1px solid var(--b1)',
              boxShadow: 'var(--shadow-strong)',
              minWidth: '260px'
            }}
          >
            {/* Spinner */}
            <div
              className="animate-spin rounded-full"
              style={{
                width: '44px',
                height: '44px',
                border: '3px solid var(--b2)',
                borderTopColor: 'var(--green)',
                borderRadius: '50%'
              }}
            />

            {/* Fő szöveg */}
            <div className="text-center">
              <div className="text-sm font-extrabold text-[var(--t1)] tracking-tight mb-1">
                PDF Generálás
              </div>
              <div className="text-xs text-[var(--t3)] font-medium">
                {pdfProgress.stage}
              </div>
            </div>

            {/* Progress bar */}
            {pdfProgress.total > 1 && (
              <div className="w-full">
                <div
                  className="w-full rounded-full overflow-hidden"
                  style={{ height: '4px', background: 'var(--s2)' }}
                >
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${Math.round((pdfProgress.current / pdfProgress.total) * 100)}%`,
                      background: 'var(--gradient-green)'
                    }}
                  />
                </div>
                <div className="text-[10px] text-[var(--t3)] text-center mt-1.5 font-bold">
                  {pdfProgress.current} / {pdfProgress.total}
                </div>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}

      <EditProjectModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        project={project}
        onSuccess={() => {
          loadData();
        }}
      />

      {FEATURE_FLAGS.CLIENT_SIGNATURE && (
        <SignatureModal
          isOpen={isSignatureModalOpen}
          onClose={() => setIsSignatureModalOpen(false)}
          onSave={handleSaveSignature}
          defaultName={project?.client_name || ''}
          projectId={id}
        />
      )}
    </div>
  );
}
