// ============================================
// sw-app.js — Service Worker (智能機械 v2)
// ============================================

const CACHE_NAME = 'family-fin-mecha-v1';

const STATIC_ASSETS = [
  './app.html',
  './app.css',
  './manifest-app.json',
  
  // Core
  './js/app-core.js',
  './js/app-data.js',
  './js/app-domain.js',
  './js/app-ui.js',
  
  // Components
  './js/components/data-table.js',
  './js/components/data-card.js',
  './js/components/stats-cards.js',
  './js/components/page-controls.js',
  
  // Entity
  './js/entity/entity-defs.js',
  './js/entity/entity-helpers.js',
  './js/entity/entity-modal.js',
  './js/entity/funds-allocation.js',
  
  // Pages
  './js/pages/dashboard.js',
  './js/pages/input-center.js',
  './js/pages/code-list.js',
  './js/pages/insurance.js',
  './js/pages/portfolio.js',
  './js/pages/settlements.js',
  './js/pages/finance.js',
  './js/pages/annual-report.js',
  './js/pages/member-report.js',
  './js/pages/settings.js',
  './js/pages/admin.js',
  
  // Loader (若您需要路由自動載入，可在此加入)
];

self.addEventListener('install', (e) => {
  console.log('[SW] Install', CACHE_NAME);
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      Promise.all(
        STATIC_ASSETS.map((url) =>
          cache.add(url).catch((err) => console.warn('[SW] 快取失敗：', url, err.message))
        )
      )
    ).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  console.log('[SW] Activate');
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/')) return;

  e.respondWith(_networkFirst(e.request));
});

async function _networkFirst(request) {
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
    return new Response('離線中，請稍後再試', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  }
}

/* ═══ EOF ═══
F: sw-app.js
V: 1792800100
W: webapp-20261023-001#45
═══ */