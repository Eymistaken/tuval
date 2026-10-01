const DATABASE = 'tuval-studio';
const STORE = 'drawings';
const LEGACY_KEY = 'smartCanvas_img';
const RECOVERY_KEY = 'tuval_recovery';
const SETTINGS_KEY = 'tuval_settings';
let databasePromise;

function database() {
  if (!databasePromise) {
    databasePromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DATABASE, 1);
      request.onupgradeneeded = () => request.result.createObjectStore(STORE);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
      request.onblocked = () => reject(new Error('Drawing storage is unavailable.'));
    });
  }
  return databasePromise;
}

function readRecovery() {
  try {
    const value = JSON.parse(localStorage.getItem(RECOVERY_KEY));
    if (value?.dataUrl?.startsWith('data:image/png;base64,') && Number.isFinite(value.changedAt)) return value;
  } catch { /* Local storage can be unavailable independently of IndexedDB. */ }
  return null;
}

async function fromDataUrl(record) {
  const response = await fetch(record.dataUrl);
  return { ...record, blob: await response.blob() };
}

export async function loadDrawing() {
  let drawing;
  let storageUnavailable = false;
  try {
    const db = await database();
    drawing = await new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE, 'readonly');
      const request = transaction.objectStore(STORE).get('current');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    if (drawing && (!(drawing.blob instanceof Blob) || drawing.blob.type !== 'image/png')) drawing = null;
  } catch { storageUnavailable = true; }

  const recovery = readRecovery();
  const storedAt = drawing?.changedAt ?? drawing?.updatedAt ?? 0;
  if (recovery && recovery.changedAt > storedAt) {
    return { ...await fromDataUrl(recovery), recovered: true, storageUnavailable };
  }
  if (drawing) return { ...drawing, storageUnavailable };

  let legacy;
  try { legacy = localStorage.getItem(LEGACY_KEY); } catch { /* Try the available storage layers independently. */ }
  if (legacy?.startsWith('data:image/png;base64,')) {
    return { ...await fromDataUrl({ dataUrl: legacy }), legacy: true, storageUnavailable };
  }
  if (storageUnavailable) throw new Error('Drawing storage is unavailable.');
  return null;
}

export async function saveDrawing(drawing) {
  const db = await database();
  await new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE, 'readwrite');
    transaction.objectStore(STORE).put({ ...drawing, updatedAt: Date.now() }, 'current');
    transaction.oncomplete = resolve;
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error || new Error('Saving was interrupted.'));
  });
  const recovery = readRecovery();
  if (recovery && recovery.changedAt <= drawing.changedAt) {
    try { localStorage.removeItem(RECOVERY_KEY); } catch { /* The primary drawing is already saved. */ }
  }
}

export function saveRecovery(drawing) {
  try {
    localStorage.setItem(RECOVERY_KEY, JSON.stringify(drawing));
    return true;
  } catch { return false; }
}

export function loadSettings() {
  try { return JSON.parse(localStorage.getItem(SETTINGS_KEY)) || {}; }
  catch { return {}; }
}

export function saveSettings(settings) {
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); }
  catch { /* Drawing autosave has its own visible error state. Settings are optional. */ }
}
