// ============================================
// sw.js — Service Worker（V2 重構版）
// 位置：sw.js
// 說明：快取名稱加入 v2 標記，避免與舊版衝突。
//       目前為骨架，後續階段會陸續補上靜態資源清單。
// ============================================

const CACHE_NAME = 'family-fin-v2-v1';

const STATIC_ASSETS = [
  './manifest.json',
  // 後續階段會加入 css、js 等檔案
];

self.addEventListener('install', (e) => {
  console.log(`[SW] install (${CACHE_NAME})`);
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      Promise.all(
        STATIC_ASSETS.map((url) =>
          cache.add(url).catch((err) => console.warn('[SW] 快取失敗：', url, err.message))
        )
      )
    ).then(() => {
      console.log('[SW] install 完成，skipWaiting');
      return self.skipWaiting();
    })
  );
});

self.addEventListener('activate', (e) => {
  console.log('[SW] activate');
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== CACHE_NAME)
          .map((k) => {
            console.log('[SW] 清除舊快取：', k);
            return caches.delete(k);
          })
      )
    ).then(() => {
      console.log('[SW] activate 完成，clients.claim');
      return self.clients.claim();
    })
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
  const isHtml = request.mode === 'navigate'
    || url.pathname.endsWith('.html')
    || url.pathname === '/'
    || url.pathname.endsWith('/');

  try {
    const res = await fetch(request);
    if (res && res.status === 200 && res.type === 'basic') {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, res.clone());
    }
    return res;
  } catch (err) {
    console.log('[SW] 網路失敗，嘗試快取：', url.pathname);
    const cached = await caches.match(request);
    if (cached) return cached;

    if (isHtml) {
      const fallback = await caches.match('./index.html');
      if (fallback) return fallback;
    }

    return new Response('離線中，請稍後再試', {
      status: 503,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }
}

/* ═══ EOF ═══
F: sw.js
V: 1792900120
W: ai-system-20261024-012#4
═══ EOF ═══ */