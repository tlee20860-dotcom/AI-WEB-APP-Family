// ============================================
// sw-app.js — SPA 專用 Service Worker
// 策略：network-first，核心預快取；不干擾舊 sw.js
// ============================================
const CACHE_NAME = 'family-fin-spa-v1';

const CORE_ASSETS = [
  './app.html',
  './app.css',
  './js/app-core.js',
  './manifest-app.json',
  './icon.svg',
];

self.addEventListener('install', (e) => {
  console.log('[SW-app] install', CACHE_NAME);
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      Promise.all(CORE_ASSETS.map((u) => cache.add(u).catch((err) => console.warn('[SW-app] 快取失敗：', u, err.message))))
    ).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  console.log('[SW-app] activate');
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k.startsWith('family-fin-spa-') && k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/')) return;
  e.respondWith(networkFirst(e.request));
});

async function networkFirst(request) {
  const url = new URL(request.url);
  const isHtml = request.mode === 'navigate' || url.pathname.endsWith('.html') || url.pathname === '/';
  try {
    const res = await fetch(request);
    if (res && res.status === 200 && res.type === 'basic') {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, res.clone());
    }
    return res;
  } catch (err) {
    const cached = await caches.match(request);
    if (cached) return cached;
    if (isHtml) {
      const fallback = await caches.match('./app.html');
      if (fallback) return fallback;
    }
    return new Response('離線中，請稍後再試', {
      status: 503,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }
}