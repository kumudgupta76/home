// Service Worker for Dock

const CACHE_VERSION = 'v3';
const CACHE_PREFIX = `dock-${encodeURIComponent(self.registration.scope)}-`;
const CACHE_NAME = `${CACHE_PREFIX}${CACHE_VERSION}`;
const STATIC_ASSETS = [
    './',
    './index.html',
    './css/styles.css',
    './js/app.js',
    './js/vendor/sortable-1.15.6.min.js',
    './data/apps.json',
    './manifest.json',
    './icons/icon.svg',
    './icons/icon-128.png',
    './icons/icon-192.png',
    './icons/icon-512.png'
];

const ASSET_URLS = new Set(STATIC_ASSETS.map((asset) => new URL(asset, self.registration.scope).href));

self.addEventListener('install', (event) => {
    event.waitUntil((async () => {
        const cache = await caches.open(CACHE_NAME);
        await cache.addAll([...ASSET_URLS].map((url) => new Request(url, { cache: 'reload' })));
    })());
});

self.addEventListener('activate', (event) => {
    event.waitUntil((async () => {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames
            .filter((name) => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME)
            .map((name) => caches.delete(name)));
        await self.clients.claim();
    })());
});

self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return;

    const url = new URL(event.request.url);
    if (event.request.mode === 'navigate') url.search = '';
    if (!ASSET_URLS.has(url.href)) return;

    event.respondWith((async () => {
        const cache = await caches.open(CACHE_NAME);
        const cached = await cache.match(url.href);
        if (cached) return cached;
        try {
            return await fetch(event.request);
        } catch {
            return new Response('Offline', { status: 503 });
        }
    })());
});

// Handle messages from clients
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});
