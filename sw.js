/* Service worker SiParkir UMSIDA — app shell instan & offline.
   - Berkas statis: stale-while-revalidate (tampil seketika dari cache, diperbarui di belakang)
   - Permintaan ke Google Apps Script (API) TIDAK pernah di-cache oleh SW (data ditangani cache aplikasi)
   Naikkan VERSI setiap kali merilis kode frontend baru. */
const VERSI = 'siparkir-v1.0.0';
const SHELL = [
  './', './index.html', './manifest.json', './css/app.css',
  './js/config.js', './js/core.js', './js/ui.js', './js/doc.js', './js/app.js',
  './js/pages/dashboard.js', './js/pages/operasional.js', './js/pages/keuangan.js', './js/pages/rekon.js', './js/pages/dc.js', './js/pages/kontrak.js', './js/pages/sistem.js',
  './vendor/bootstrap.min.css', './vendor/fa/css/fontawesome.min.css', './vendor/fa/css/solid.min.css', './vendor/fa/css/regular.min.css',
  './vendor/fa/webfonts/fa-solid-900.woff2', './vendor/fa/webfonts/fa-regular-400.woff2',
  './vendor/fonts/source-sans-3-latin-400-normal.woff2', './vendor/fonts/source-sans-3-latin-600-normal.woff2', './vendor/fonts/source-sans-3-latin-700-normal.woff2',
  './vendor/chart.umd.js', './icons/icon-192.png', './icons/apple-touch-icon.png', './icons/favicon-32.png'
];
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSI).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSI).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET') return;                                   // POST API → langsung ke jaringan
  if (/script\.google(usercontent)?\.com$/.test(url.hostname)) return; // API GAS tidak di-cache SW
  if (url.origin !== location.origin && !/cdn\.sheetjs\.com/.test(url.hostname)) return;
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then((r) => { const c = r.clone(); caches.open(VERSI).then((x) => x.put('./index.html', c)); return r; }).catch(() => caches.match('./index.html')));
    return;
  }
  e.respondWith(caches.open(VERSI).then((cache) => cache.match(req).then((hit) => {
    const net = fetch(req).then((r) => { if (r && r.ok) cache.put(req, r.clone()); return r; }).catch(() => hit);
    return hit || net;
  })));
});
