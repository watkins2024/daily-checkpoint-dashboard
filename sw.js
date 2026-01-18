/**
 * Service Worker for offline-first PWA capabilities
 */

const CACHE_NAME = 'daily-checkpoint-v2.0';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './index-v2.html',
  './walks.html',
  './work.html',
  './business.html',
  './leverage.html',
  './household.html',
  './src/core/Component.js',
  './src/core/Router.js',
  './src/core/EventBus.js',
  './src/lib/Analytics.js',
  './src/components/Toast.js',
  './src/components/KeyboardShortcuts.js',
  './src/components/AnalyticsDashboard.js',
  './src/styles/design-system.css',
  './scripts/store-sync.js',
  './scripts/auth-ui.js',
  './scripts/whatsnext.js',
];

// Install event - cache assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching assets');
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');

  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME)
            .map((name) => {
              console.log('[SW] Deleting old cache:', name);
              return caches.delete(name);
            })
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  // Skip Supabase API calls
  if (event.request.url.includes('supabase.co')) {
    return event.respondWith(fetch(event.request));
  }

  // Skip CDN requests (but cache them dynamically)
  if (event.request.url.includes('cdn.jsdelivr.net') ||
      event.request.url.includes('fonts.googleapis.com') ||
      event.request.url.includes('fonts.gstatic.com')) {
    return event.respondWith(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.match(event.request).then((response) => {
          return response || fetch(event.request).then((fetchResponse) => {
            cache.put(event.request, fetchResponse.clone());
            return fetchResponse;
          });
        });
      })
    );
  }

  // Network-first strategy for HTML pages
  if (event.request.url.endsWith('.html') || event.request.url.endsWith('/')) {
    return event.respondWith(
      fetch(event.request)
        .then((response) => {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
          return response;
        })
        .catch(() => {
          return caches.match(event.request);
        })
    );
  }

  // Cache-first strategy for other assets
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) {
          return response;
        }

        return fetch(event.request).then((fetchResponse) => {
          // Don't cache if not successful
          if (!fetchResponse || fetchResponse.status !== 200) {
            return fetchResponse;
          }

          // Clone and cache the response
          const responseClone = fetchResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });

          return fetchResponse;
        });
      })
      .catch(() => {
        // Return offline page if available
        return caches.match('./index.html');
      })
  );
});

// Background sync for data persistence
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag);

  if (event.tag === 'sync-dashboard-data') {
    event.waitUntil(syncDashboardData());
  }
});

// Push notifications (for future use)
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received');

  const options = {
    body: event.data ? event.data.text() : 'New update available',
    icon: './icon-192.png',
    badge: './icon-badge.png',
    vibrate: [200, 100, 200],
    tag: 'dashboard-notification',
    requireInteraction: false,
  };

  event.waitUntil(
    self.registration.showNotification('Daily Checkpoint', options)
  );
});

// Helper function to sync data
async function syncDashboardData() {
  try {
    // Get all clients
    const clients = await self.clients.matchAll();

    // Send sync request to all clients
    clients.forEach((client) => {
      client.postMessage({
        type: 'SYNC_DATA',
        timestamp: Date.now(),
      });
    });

    console.log('[SW] Data sync requested');
  } catch (error) {
    console.error('[SW] Sync failed:', error);
  }
}
