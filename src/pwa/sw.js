/* Generated as /sw.js by scripts/build-pwa.cjs. No user data or app pages are cached. */
const CACHE_PREFIX = 'lojasmanu-pwa-';
const CACHE_NAME = CACHE_PREFIX + '__PWA_REVISION__';
const OFFLINE_URL = '/offline.html';
const PUBLIC_ASSETS = [OFFLINE_URL, '/icon-192x192.png', '/icon-512x512.png', '/icon-maskable-512x512.png', '/apple-touch-icon.png', '/favicon-32x32.png'];

self.addEventListener('install', event => {
  // Failure to download an asset aborts installation; the previous worker remains active.
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(PUBLIC_ASSETS)));
  // Updates wait for operator approval or for all existing tabs to close.
});

self.addEventListener('activate', event => {
  const legacyCaches = ['supabase-cache', 'images-cache', 'google-fonts-cache', 'static-resources'];
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter(name =>
      (name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME) ||
      legacyCaches.includes(name) || (name.startsWith('workbox-precache-') && name.endsWith('-' + self.registration.scope))
    ).map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') event.waitUntil(self.skipWaiting());
});

self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);
  // API, auth, Supabase, mutations and Next RSC/prefetch requests always use the network.
  if (request.method !== 'GET' || url.origin !== self.location.origin ||
      url.pathname === '/api' || url.pathname.startsWith('/api/') ||
      request.headers.has('RSC') || request.headers.has('Next-Router-Prefetch') || url.searchParams.has('_rsc')) return;

  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(async () => {
      const cache = await caches.open(CACHE_NAME);
      return (await cache.match(OFFLINE_URL)) || Response.error();
    }));
    return;
  }
  if (PUBLIC_ASSETS.includes(url.pathname) && !url.search) {
    event.respondWith(caches.open(CACHE_NAME).then(async cache =>
      (await cache.match(url.pathname)) || fetch(request)
    ));
  }
});
