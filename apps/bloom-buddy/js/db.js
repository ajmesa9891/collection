// Minimal promise-based IndexedDB wrapper.
const DB_NAME = 'bloom-buddy';
const DB_VERSION = 1;
let dbp;

function open() {
  if (dbp) return dbp;
  dbp = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('finds')) {
        const s = db.createObjectStore('finds', { keyPath: 'id' });
        s.createIndex('createdAt', 'createdAt');
        s.createIndex('plantKey', 'plantKey');
        s.createIndex('rideId', 'rideId');
      }
      if (!db.objectStoreNames.contains('plants')) db.createObjectStore('plants', { keyPath: 'key' });
      if (!db.objectStoreNames.contains('rides')) db.createObjectStore('rides', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('cache')) db.createObjectStore('cache', { keyPath: 'url' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbp;
}

async function tx(store, mode, fn) {
  const db = await open();
  return new Promise((resolve, reject) => {
    const t = db.transaction(store, mode);
    const s = t.objectStore(store);
    let result;
    Promise.resolve(fn(s)).then((r) => (result = r));
    t.oncomplete = () => resolve(result);
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error);
  });
}

const reqP = (r) => new Promise((res, rej) => ((r.onsuccess = () => res(r.result)), (r.onerror = () => rej(r.error))));

export const db = {
  get: (store, key) => tx(store, 'readonly', (s) => reqP(s.get(key))),
  put: (store, val) => tx(store, 'readwrite', (s) => reqP(s.put(val))),
  del: (store, key) => tx(store, 'readwrite', (s) => reqP(s.delete(key))),
  all: (store) => tx(store, 'readonly', (s) => reqP(s.getAll())),
  clear: (store) => tx(store, 'readwrite', (s) => reqP(s.clear())),
  byIndex: (store, index, value) => tx(store, 'readonly', (s) => reqP(s.index(index).getAll(value))),
};

export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

/** Cached JSON fetch (IndexedDB), so plant cards keep working offline. */
export async function cachedJson(url, { maxAgeDays = 30 } = {}) {
  const hit = await db.get('cache', url).catch(() => null);
  const fresh = hit && Date.now() - hit.at < maxAgeDays * 864e5;
  if (fresh) return hit.data;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    db.put('cache', { url, at: Date.now(), data }).catch(() => {});
    return data;
  } catch (e) {
    if (hit) return hit.data;
    throw e;
  }
}

// Object URLs for photo blobs (reused so we don't leak).
const urlCache = new Map();
export function blobUrl(key, blob) {
  if (!blob) return '';
  const k = key + ':' + blob.size;
  if (!urlCache.has(k)) urlCache.set(k, URL.createObjectURL(blob));
  return urlCache.get(k);
}
