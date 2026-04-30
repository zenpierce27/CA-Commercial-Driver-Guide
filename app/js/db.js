// IndexedDB wrapper — tracks question history, mock exam attempts, settings.
// Schema:
//   answers: { id (auto), questionId, sectionId, correct, ts }
//   attempts: { id (auto), examType, sectionId, total, correct, missedIds, ts }
//   settings: { key, value }

const DB_NAME = 'cdl-study';
const DB_VERSION = 1;

let _db;

function open() {
  if (_db) return Promise.resolve(_db);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('answers')) {
        const s = db.createObjectStore('answers', { keyPath: 'id', autoIncrement: true });
        s.createIndex('questionId', 'questionId');
        s.createIndex('sectionId', 'sectionId');
        s.createIndex('ts', 'ts');
      }
      if (!db.objectStoreNames.contains('attempts')) {
        const s = db.createObjectStore('attempts', { keyPath: 'id', autoIncrement: true });
        s.createIndex('ts', 'ts');
        s.createIndex('examType', 'examType');
      }
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'key' });
      }
    };
    req.onsuccess = (e) => { _db = e.target.result; resolve(_db); };
    req.onerror = (e) => reject(e.target.error);
  });
}

function tx(storeNames, mode = 'readonly') {
  return open().then(db => db.transaction(storeNames, mode));
}

export async function recordAnswer({ questionId, sectionId, correct }) {
  const t = await tx(['answers'], 'readwrite');
  return new Promise((resolve, reject) => {
    const req = t.objectStore('answers').add({ questionId, sectionId, correct, ts: Date.now() });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function recordAttempt({ examType, sectionId, total, correct, missedIds }) {
  const t = await tx(['attempts'], 'readwrite');
  return new Promise((resolve, reject) => {
    const req = t.objectStore('attempts').add({
      examType, sectionId, total, correct,
      missedIds: missedIds || [],
      ts: Date.now()
    });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function getQuestionStats() {
  const t = await tx(['answers']);
  const store = t.objectStore('answers');
  return new Promise((resolve) => {
    const stats = {};
    const req = store.openCursor();
    req.onsuccess = (e) => {
      const c = e.target.result;
      if (!c) return resolve(stats);
      const r = c.value;
      const s = stats[r.questionId] = stats[r.questionId] || { attempts: 0, correct: 0, lastTs: 0, lastCorrect: false };
      s.attempts += 1;
      if (r.correct) s.correct += 1;
      if (r.ts > s.lastTs) { s.lastTs = r.ts; s.lastCorrect = r.correct; }
      c.continue();
    };
  });
}

export async function getRecentAttempts(limit = 10) {
  const t = await tx(['attempts']);
  const idx = t.objectStore('attempts').index('ts');
  return new Promise((resolve) => {
    const out = [];
    const req = idx.openCursor(null, 'prev');
    req.onsuccess = (e) => {
      const c = e.target.result;
      if (!c || out.length >= limit) return resolve(out);
      out.push(c.value);
      c.continue();
    };
  });
}

export async function getSetting(key, fallback = null) {
  const t = await tx(['settings']);
  return new Promise((resolve) => {
    const req = t.objectStore('settings').get(key);
    req.onsuccess = () => resolve(req.result ? req.result.value : fallback);
    req.onerror = () => resolve(fallback);
  });
}

export async function setSetting(key, value) {
  const t = await tx(['settings'], 'readwrite');
  return new Promise((resolve, reject) => {
    const req = t.objectStore('settings').put({ key, value });
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function clearAll() {
  const t = await tx(['answers', 'attempts'], 'readwrite');
  t.objectStore('answers').clear();
  t.objectStore('attempts').clear();
  return new Promise((resolve) => { t.oncomplete = () => resolve(); });
}
