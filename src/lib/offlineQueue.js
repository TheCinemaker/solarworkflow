const DB_NAME = 'VoltDeskOffline';
const DB_VERSION = 1;
const STORE_NAME = 'photoQueue';

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
      }
    };
    request.onsuccess = (e) => resolve(e.target.result);
    request.onerror = (e) => reject(e.target.error);
  });
}

export async function savePhotoToQueue({ projectId, userId, fileBlob, fileName, description, isIssue }) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const item = {
      projectId,
      userId,
      fileBlob,
      fileName,
      description,
      isIssue,
      createdAt: new Date().toISOString()
    };
    const request = store.add(item);
    request.onsuccess = () => resolve(true);
    request.onerror = (e) => reject(e.target.error);
  });
}

export async function getPhotoQueue() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();
    request.onsuccess = (e) => resolve(e.target.result);
    request.onerror = (e) => reject(e.target.error);
  });
}

export async function removeFromQueue(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);
    request.onsuccess = () => resolve(true);
    request.onerror = (e) => reject(e.target.error);
  });
}

export async function getQueueCount() {
  try {
    const queue = await getPhotoQueue();
    return queue.length;
  } catch (err) {
    console.error("Hiba a sor lekérdezésekor:", err);
    return 0;
  }
}

// Background sync function
export async function processOfflineQueue(supabaseInstance) {
  if (!navigator.onLine) {
    console.log("Offline vagyunk, nincs szinkronizáció.");
    return { success: false, count: 0 };
  }
  
  let queue;
  try {
    queue = await getPhotoQueue();
  } catch (err) {
    console.error("Nem sikerült lekérni a várólistát IndexedDB-ből:", err);
    return { success: false, count: 0 };
  }

  if (!queue || queue.length === 0) {
    return { success: true, count: 0 };
  }

  console.log(`Találtunk ${queue.length} szinkronizálandó offline képet...`);
  let successCount = 0;

  for (const item of queue) {
    try {
      // 1. Fájl feltöltése a Supabase Storage-ba
      const fileExt = item.fileName.split('.').pop();
      const fileName = `${Date.now()}_offline_${item.id}.${fileExt}`;
      const filePath = `${item.projectId}/${fileName}`;

      const { error: uploadErr } = await supabaseInstance.storage
        .from('project-photos')
        .upload(filePath, item.fileBlob);

      if (uploadErr) throw uploadErr;

      // 2. Publikus URL lekérése
      const { data: urlData } = supabaseInstance.storage
        .from('project-photos')
        .getPublicUrl(filePath);

      const publicUrl = urlData.publicUrl;

      // 3. Rekord mentése a public.media táblába
      const { error: dbInsertErr } = await supabaseInstance
        .from('media')
        .insert([{
          project_id: item.projectId,
          user_id: item.userId,
          file_path: publicUrl,
          description: item.description || '',
          is_issue: item.isIssue
        }]);

      if (dbInsertErr) throw dbInsertErr;

      // 4. Eltávolítás a helyi IndexedDB-ből
      await removeFromQueue(item.id);
      successCount++;
      console.log(`Offline kép sikeresen feltöltve és szinkronizálva. (ID: ${item.id})`);
    } catch (err) {
      console.error(`Sikertelen offline feltöltés az elemnél (ID: ${item.id}):`, err);
      // Ha hálózati probléma miatt megszakad, ne próbáljuk a többit ebben a körben
      break;
    }
  }

  if (successCount > 0) {
    // Értesítjük a többi komponenst
    window.dispatchEvent(new CustomEvent('offline-sync-completed', { detail: { count: successCount } }));
  }

  return { success: true, count: successCount };
}
