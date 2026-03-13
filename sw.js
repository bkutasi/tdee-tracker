/**
 * TDEE Tracker - Service Worker
 * Enables offline functionality with cache-first strategy
 */

// Version must be manually incremented before each deployment
const CACHE_VERSION = '1.0.0';
const CACHE_NAME = `tdee-tracker-v${CACHE_VERSION}`;
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/manifest.json',
    '/css/styles.css',
    '/js/utils.js',
    '/js/calculator.js',
    '/js/storage.js',
    '/js/ui/components.js',
    '/js/ui/dailyEntry.js',
    '/js/ui/weeklyView.js',
    '/js/ui/dashboard.js',
    '/js/ui/settings.js',
    '/js/ui/chart.js',
    '/js/app.js'
];

// Install: cache static assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Caching static assets');
                return cache.addAll(STATIC_ASSETS);
            })
            .then(() => {
                console.log('Service worker installed, skipping waiting');
                self.skipWaiting();
            })
    );
});

// Activate: clean old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames
                        .filter((name) => name !== CACHE_NAME)
                        .map((name) => caches.delete(name))
                );
            })
            .then(() => {
                console.log('Service worker activated, claiming clients');
                return self.clients.claim();
            })
    );
});

// Handle messages from clients (e.g., skip waiting)
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        console.log('Received SKIP_WAITING message, activating immediately');
        self.skipWaiting();
    }
});

// Fetch: cache-first for static, network-first for dynamic
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip non-GET requests
    if (request.method !== 'GET') return;

    // Skip external requests
    if (url.origin !== location.origin) return;

    event.respondWith(
        caches.match(request)
            .then((cachedResponse) => {
                if (cachedResponse) {
                    // Return cached version
                    return cachedResponse;
                }

                // Fetch from network and cache
                return fetch(request)
                    .then((response) => {
                        // Don't cache non-ok responses
                        if (!response || response.status !== 200) {
                            return response;
                        }

                        // Clone and cache
                        const responseToCache = response.clone();
                        caches.open(CACHE_NAME)
                            .then((cache) => cache.put(request, responseToCache));

                        return response;
                    })
                    .catch(() => {
                        // Offline fallback for HTML
                        if (request.headers.get('accept').includes('text/html')) {
                            return caches.match('/');
                        }
                    });
            })
    );
});

// Background sync (for future Supabase integration)
self.addEventListener('sync', (event) => {
    if (event.tag === 'sync-entries') {
        event.waitUntil(syncEntries());
    }
});

async function syncEntries() {
    // Placeholder for future Supabase sync
    console.log('Background sync triggered - placeholder for Supabase integration');
}
