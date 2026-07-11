// Large binary-ish payloads (product photo/generated-image data URLs) don't
// belong in localStorage — a handful of them blows through the ~5-10MB
// per-origin quota. This stores them in IndexedDB instead, keyed by the
// same id as the catalog item / placed object they belong to, so the
// zustand-persisted state can hold just that id and stay tiny.
const DB_NAME = 'space-layout-images';
const DB_VERSION = 1;
const STORE_NAME = 'images';

let dbPromise = null;

function openDb() {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null);
  if (!dbPromise) {
    dbPromise = new Promise((resolve) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains(STORE_NAME)) {
          request.result.createObjectStore(STORE_NAME);
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => {
        // eslint-disable-next-line no-console
        console.error('[imageStore] failed to open IndexedDB', request.error);
        resolve(null);
      };
    });
  }
  return dbPromise;
}

async function withStore(mode, run) {
  const db = await openDb();
  if (!db) return undefined;
  return new Promise((resolve) => {
    const tx = db.transaction(STORE_NAME, mode);
    const store = tx.objectStore(STORE_NAME);
    const request = run(store);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => {
      // eslint-disable-next-line no-console
      console.error('[imageStore] transaction failed', request.error);
      resolve(undefined);
    };
  });
}

export function saveImageBlob(id, dataUrl) {
  if (!id || !dataUrl) return Promise.resolve();
  return withStore('readwrite', (store) => store.put(dataUrl, id));
}

export function getImageBlob(id) {
  if (!id) return Promise.resolve(undefined);
  return withStore('readonly', (store) => store.get(id));
}

export function deleteImageBlob(id) {
  if (!id) return Promise.resolve();
  return withStore('readwrite', (store) => store.delete(id));
}

export async function getImageBlobs(ids) {
  const uniqueIds = [...new Set(ids.filter(Boolean))];
  const entries = await Promise.all(uniqueIds.map(async (id) => [id, await getImageBlob(id)]));
  return new Map(entries.filter(([, value]) => value));
}
