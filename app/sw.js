// Service worker — cache shell + data for offline use
const CACHE_VERSION = 'cdl-v1';
const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './js/main.js',
  './js/quiz.js',
  './js/walkaround.js',
  './js/data.js',
  './js/db.js',
  './data/sections.json',
  './data/questions/general-knowledge.json',
  './data/questions/air-brakes.json',
  './data/questions/combination-vehicles.json',
  './data/questions/doubles-triples.json',
  './data/questions/tank-vehicles.json',
  './data/inspection/walkaround.json',
  './icons/icon.svg'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_VERSION).then(c => c.addAll(SHELL).catch(() => {}))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_VERSION).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return;
  e.respondWith(
    caches.match(e.request).then(cached => {
      const fetcher = fetch(e.request).then(res => {
        const copy = res.clone();
        caches.open(CACHE_VERSION).then(c => c.put(e.request, copy)).catch(() => {});
        return res;
      }).catch(() => cached);
      return cached || fetcher;
    })
  );
});
