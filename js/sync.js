// ☁️ Cloud sync with Firebase Firestore.
// Phones linked with the same family code share: parent settings, gifts, own words (with photos),
// stars, stickers, learning stats and the gift exchange record.
//
// Cloud layout:
//   families/{CODE}                 { settings, gifts, words, progress, redemptions, updatedAt }
//   families/{CODE}/photos/{wordId} { data }   (photos are kept apart to stay under the 1 MB doc limit)
//
// Each section is replaced as a whole; the latest change to a section wins.
import { firebaseConfig } from './firebase-config.js';
import * as store from './store.js';

const SDK = 'https://www.gstatic.com/firebasejs/10.14.1';
const LINK_KEY = 'daily-challenge-family';
const SECTIONS = ['settings', 'gifts', 'words', 'progress', 'redemptions'];
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no I, O, 0, 1 (easy to mix up)
const CODE_RE = /^[A-Z0-9]{16}$/;

let fb = null;          // { db, fs } once connected
let unsubscribe = null;
let pushTimer = null;
let lastSynced = {};    // section -> stable JSON last seen in / sent to the cloud
let status = 'off';     // off | connecting | syncing | synced | offline | error
let statusDetail = '';
const statusListeners = new Set();
const remoteListeners = new Set();

export const configured = () => !!(firebaseConfig && firebaseConfig.apiKey && firebaseConfig.projectId);
export const getStatus = () => ({ status, detail: statusDetail });
export const onStatus = fn => { statusListeners.add(fn); return () => statusListeners.delete(fn); };
// Called after changes from another phone have been applied here.
export const onRemoteChange = fn => { remoteListeners.add(fn); return () => remoteListeners.delete(fn); };

function setStatus(s, detail = '') {
  status = s;
  statusDetail = detail;
  statusListeners.forEach(fn => fn(s, detail));
}

export function familyCode() {
  try { return localStorage.getItem(LINK_KEY) || ''; } catch { return ''; }
}
const photosKey = code => `${LINK_KEY}-photos-${code}`;

export const formatCode = code => (code.match(/.{1,4}/g) || []).join('-');
export const normaliseCode = input => String(input).toUpperCase().replace(/[^A-Z0-9]/g, '');

function newCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return [...bytes].map(b => ALPHABET[b % ALPHABET.length]).join('');
}

// JSON with sorted keys, so the same data always gives the same text.
function stable(x) {
  if (Array.isArray(x)) return `[${x.map(stable).join(',')}]`;
  if (x && typeof x === 'object') {
    return `{${Object.keys(x).sort().map(k => `${JSON.stringify(k)}:${stable(x[k])}`).join(',')}}`;
  }
  return JSON.stringify(x ?? null);
}

async function connect() {
  if (fb) return fb;
  const [{ initializeApp }, auth, fs] = await Promise.all([
    import(`${SDK}/firebase-app.js`),
    import(`${SDK}/firebase-auth.js`),
    import(`${SDK}/firebase-firestore.js`),
  ]);
  const app = initializeApp(firebaseConfig);
  let db;
  try {
    // Keeps working offline; changes are sent when the phone is back online.
    db = fs.initializeFirestore(app, { localCache: fs.persistentLocalCache({ tabManager: fs.persistentMultipleTabManager() }) });
  } catch {
    db = fs.getFirestore(app);
  }
  await auth.signInAnonymously(auth.getAuth(app));
  fb = { db, fs };
  return fb;
}

const familyDoc = code => fb.fs.doc(fb.db, 'families', code);
const photoDoc = (code, id) => fb.fs.doc(fb.db, 'families', code, 'photos', id);

// ---------- Sending changes ----------
function schedulePush() {
  if (!fb || !familyCode()) return;
  clearTimeout(pushTimer);
  pushTimer = setTimeout(push, 1200);
}

function push() {
  const code = familyCode();
  if (!fb || !code) return;
  const sections = store.exportSections();
  const changed = {};
  for (const k of SECTIONS) {
    const s = stable(sections[k]);
    if (s !== lastSynced[k]) { changed[k] = sections[k]; lastSynced[k] = s; }
  }
  pushPhotos(code);
  if (!Object.keys(changed).length) return;
  setStatus('syncing');
  fb.fs.setDoc(familyDoc(code), { ...changed, updatedAt: fb.fs.serverTimestamp() }, { merge: true })
    .catch(e => setStatus('error', e.code || e.message));
}

function pushPhotos(code) {
  let sent;
  try { sent = new Set(JSON.parse(localStorage.getItem(photosKey(code)) || '[]')); } catch { sent = new Set(); }
  const words = store.customWords();
  const withPhoto = new Set(words.filter(w => w.img).map(w => w.id));
  let changed = false;
  for (const w of words) {
    if (w.img && !sent.has(w.id)) {
      fb.fs.setDoc(photoDoc(code, w.id), { data: w.img }).catch(() => {});
      sent.add(w.id);
      changed = true;
    }
  }
  for (const id of [...sent]) {
    const stillThere = words.some(w => w.id === id);
    if (!stillThere) {
      fb.fs.deleteDoc(photoDoc(code, id)).catch(() => {});
      sent.delete(id);
      changed = true;
    } else if (!withPhoto.has(id)) {
      sent.delete(id); // photo not on this phone (yet); leave the cloud copy alone
      changed = true;
    }
  }
  if (changed) {
    try { localStorage.setItem(photosKey(code), JSON.stringify([...sent])); } catch { /* ignore */ }
  }
}

// ---------- Receiving changes ----------
function applyRemote(data) {
  const incoming = {};
  for (const k of SECTIONS) {
    if (data[k] === undefined) continue;
    const s = stable(data[k]);
    if (s !== lastSynced[k]) { incoming[k] = data[k]; lastSynced[k] = s; }
  }
  if (!Object.keys(incoming).length) return;
  store.importSections(incoming);
  fetchMissingPhotos(familyCode());
  remoteListeners.forEach(fn => fn(incoming));
}

async function fetchMissingPhotos(code) {
  for (const id of store.wordsMissingPhotos()) {
    try {
      const snap = await fb.fs.getDoc(photoDoc(code, id));
      if (snap.exists()) {
        store.setWordPhoto(id, snap.data().data);
        remoteListeners.forEach(fn => fn({ words: true }));
      }
    } catch { /* try again next time */ }
  }
}

function listen(code) {
  if (unsubscribe) unsubscribe();
  unsubscribe = fb.fs.onSnapshot(familyDoc(code), { includeMetadataChanges: true }, snap => {
    const meta = snap.metadata;
    if (!snap.exists()) {
      if (!meta.fromCache) setStatus('error', 'not-found');
      return;
    }
    setStatus(meta.hasPendingWrites ? 'syncing' : meta.fromCache ? 'offline' : 'synced');
    if (meta.hasPendingWrites) return; // our own change on its way up
    applyRemote(snap.data());
  }, e => setStatus('error', e.code || e.message));
}

// ---------- Linking ----------
// Start syncing on app start if this phone is already linked.
export async function start() {
  store.onSave(schedulePush);
  const code = familyCode();
  if (!configured() || !code) { setStatus('off'); return; }
  setStatus('connecting');
  try {
    await connect();
    listen(code);
  } catch (e) {
    setStatus(navigator.onLine ? 'error' : 'offline', e.code || e.message);
  }
}

// Make a new family code and upload this phone's data to it.
export async function createFamily() {
  setStatus('connecting');
  await connect();
  const code = newCode();
  localStorage.setItem(LINK_KEY, code);
  lastSynced = {};
  push();
  listen(code);
  return code;
}

// Link to an existing family code. This phone's data is replaced by the cloud copy.
export async function joinFamily(input) {
  const code = normaliseCode(input);
  if (!CODE_RE.test(code)) throw new Error('bad-code');
  setStatus('connecting');
  await connect();
  const snap = await fb.fs.getDoc(familyDoc(code));
  if (!snap.exists()) { setStatus('off'); throw new Error('not-found'); }
  localStorage.setItem(LINK_KEY, code);
  try { localStorage.removeItem(photosKey(code)); } catch { /* ignore */ }
  lastSynced = {};
  applyRemote(snap.data());
  listen(code);
  return code;
}

// Stop syncing on this phone. Its data stays here; the cloud copy is untouched.
export function unlink() {
  if (unsubscribe) unsubscribe();
  unsubscribe = null;
  clearTimeout(pushTimer);
  try { localStorage.removeItem(LINK_KEY); } catch { /* ignore */ }
  lastSynced = {};
  setStatus('off');
}
