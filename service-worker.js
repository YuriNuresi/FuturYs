/**
 * FuturY - Service Worker
 * Caching strategy:
 * - App Shell (HTML, CSS, local JS): Cache-first, update in background
 * - CDN resources (Three.js): Cache-first with network fallback
 * - API calls (php/): Network-only (dynamic game data)
 * - Icons/assets: Cache-first
 */

const CACHE_NAME = 'futury-v1';
const CDN_CACHE = 'futury-cdn-v1';

const APP_SHELL = [
    '/',
    '/index.html',
    '/game.html',
    '/manifest.json',
    '/css/variables.css',
    '/css/base.css',
    '/css/game.css',
    '/css/panels.css',
    '/css/responsive.css',
    '/css/nation-selector.css',
    '/assets/icons/icon.svg'
];

// Install: pre-cache app shell
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(APP_SHELL);
        }).then(() => self.skipWaiting())
    );
});

// Activate: clean old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys
                    .filter((key) => key !== CACHE_NAME && key !== CDN_CACHE)
                    .map((key) => caches.delete(key))
            );
        }).then(() => self.clients.claim())
    );
});

// Fetch: routing strategy
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // Skip non-GET requests
    if (event.request.method !== 'GET') return;

    // API calls: network-only
    if (url.pathname.startsWith('/php/')) {
        return;
    }

    // CDN resources (Three.js): cache-first with network fallback
    if (url.hostname.includes('cdn.jsdelivr.net')) {
        event.respondWith(cacheFirst(event.request, CDN_CACHE));
        return;
    }

    // Local JS modules: stale-while-revalidate (supports ?v= cache busting)
    if (url.pathname.startsWith('/js/')) {
        event.respondWith(staleWhileRevalidate(event.request, CACHE_NAME));
        return;
    }

    // App shell and other local resources: stale-while-revalidate
    event.respondWith(staleWhileRevalidate(event.request, CACHE_NAME));
});

/**
 * Cache-first strategy: return cached version, fallback to network
 */
async function cacheFirst(request, cacheName) {
    const cached = await caches.match(request);
    if (cached) return cached;

    try {
        const response = await fetch(request);
        if (response.ok) {
            const cache = await caches.open(cacheName);
            cache.put(request, response.clone());
        }
        return response;
    } catch (err) {
        return new Response('Offline', { status: 503 });
    }
}

/**
 * Stale-while-revalidate: return cached immediately, update cache in background
 */
async function staleWhileRevalidate(request, cacheName) {
    const cache = await caches.open(cacheName);
    const cached = await cache.match(request);

    const fetchPromise = fetch(request).then((response) => {
        if (response.ok) {
            cache.put(request, response.clone());
        }
        return response;
    }).catch(() => cached);

    return cached || fetchPromise;
}
