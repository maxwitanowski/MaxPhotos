// Tiny IndexedDB wrapper — persists the watermarked photos locally.

const DB_NAME = 'mphotos';
const STORE = 'photos';

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx(mode, fn) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const store = t.objectStore(STORE);
    const result = fn(store);
    t.oncomplete = () => resolve(result.result ?? result);
    t.onerror = () => reject(t.error);
  });
}

export async function savePhoto(photo) {
  await tx('readwrite', (store) => store.put(photo));
  return photo;
}

export async function getAllPhotos() {
  const photos = await tx('readonly', (store) => store.getAll());
  return photos.sort((a, b) => b.addedAt - a.addedAt);
}

export async function deletePhoto(id) {
  await tx('readwrite', (store) => store.delete(id));
}
