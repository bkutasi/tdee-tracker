/**
 * TDEE Tracker - Service Worker
 * Enables offline functionality with cache-first strategy
 */

// Version must be manually incremented before each deployment
const CACHE_VERSION = '1.0.7';
const CACHE_NAME = `tdee-tracker-v${CACHE_VERSION}`;
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/manifest.json',
    '/css/styles.css',
    // JS core modules
    '/js/app.js',
    '/js/auth.js',
    '/js/calculator-ewma.js',
    '/js/calculator-tdee.js',
    '/js/calculator.js',
    '/js/storage.js',
    '/js/sync.js',
    '/js/utils.js',
    '/js/version.js',
    // UI components
    '/js/ui/chart.js',
    '/js/ui/components.js',
    '/js/ui/dailyEntry.js',
    '/js/ui/dashboard.js',
    '/js/ui/focusTrap.js',
    '/js/ui/settings.js',
    '/js/ui/weeklyView.js',
    // Icons
    '/icons/icon-32.png',
    '/icons/icon-192.png',
    '/icons/icon-512.png'
];

// Install: cache static assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Caching static assets');
                return cache.addAll(STATIC_ASSETS);
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

// Fetch: cache-first for static, network-first for API
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
