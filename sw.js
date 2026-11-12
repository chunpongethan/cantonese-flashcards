// Offline support: app files are cached up front; fonts, Hanzi Writer and
// stroke data are cached the first time they load.
const VERSION = 'v12';
const APP_CACHE = `app-${VERSION}`;
const RUNTIME_CACHE = `runtime-${VERSION}`;

const APP_FILES = [
  './',
  'index.html',
  'manifest.webmanifest',
  'css/style.css',
  'js/app.js',
  'js/ui.js',
  'js/words.js',
  'js/monsters.js',
  'js/speech.js',
  'js/sfx.js',
  'js/store.js',
  'js/sync.js',
  'js/firebase-config.js',
  'js/catalog.js',
  'js/parent.js',
  'js/bank.js',
  'js/modes/flip.js',
  'js/modes/pick.js',
  'js/modes/match.js',
  'js/modes/trace.js',
  'js/modes/maths.js',
  'js/modes/spell.js',
  'js/modes/radical.js',
  'js/modes/fill.js',
  'js/lessons.js',
  'icons/icon-192.png',
  'icons/icon-512.png',
];

const RUNTIME_HOSTS = ['cdn.jsdelivr.net', 'fonts.googleapis.com', 'fonts.gstatic.com', 'www.gstatic.com'];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(APP_CACHE).then(c => c.addAll(APP_FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => ![APP_CACHE, RUNTIME_CACHE].includes(k)).map(k => caches.delete(k))))
      .then(() => self.clients.claim()));
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Own files: network first (so updates show up), fall back to cache offline.
  if (url.origin === location.origin) {
    event.respondWith(
      fetch(req)
        .then(res => {
          const copy = res.clone();
          caches.open(APP_CACHE).then(c => c.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req, { ignoreSearch: true })));
    return;
  }

  // CDN files never change for a pinned version: cache first.
  if (RUNTIME_HOSTS.includes(url.hostname)) {
    event.respondWith(
      caches.match(req).then(hit => hit || fetch(req).then(res => {
        if (res.ok || res.type === 'opaque') {
          const copy = res.clone();
          caches.open(RUNTIME_CACHE).then(c => c.put(req, copy));
        }
        return res;
      })));
  }
});
