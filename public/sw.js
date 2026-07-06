const CACHE_NAME = 'booth-pos-app-v1';
const APP_SHELL_URLS = ['/', '/index.html', '/pos.html'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cacheAppShell(cache))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;

  if (request.mode === 'navigate') {
    event.respondWith(networkFirstWithAppShellFallback(request));
    return;
  }

  event.respondWith(cacheFirst(request));
});

async function networkFirstWithAppShellFallback(request) {
  const cache = await caches.open(CACHE_NAME);

  try {
    const response = await fetch(request);
    if (response.ok) await cache.put(request, response.clone());
    return response;
  } catch (error) {
    return (
      await cache.match(request) ||
      await cache.match('/index.html') ||
      await cache.match('/')
    );
  }
}

async function cacheAppShell(cache) {
  await cache.addAll(APP_SHELL_URLS);

  try {
    const indexResponse = await fetch('/index.html', { cache: 'no-cache' });
    if (!indexResponse.ok) return;

    const indexHtml = await indexResponse.clone().text();
    await cache.put('/index.html', indexResponse);

    const assetUrls = [...indexHtml.matchAll(/(?:src|href)="([^"]+)"/g)]
      .map((match) => match[1])
      .filter((assetUrl) => assetUrl.startsWith('/assets/'));

    await Promise.all(assetUrls.map((assetUrl) => cache.add(assetUrl).catch(() => undefined)));
  } catch (error) {
    console.warn('[service-worker] app shell asset caching failed', error);
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response.ok) await cache.put(request, response.clone());
  return response;
}