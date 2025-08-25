const CACHE_NAME = 'product-catalogue-cache-v4'; // Incremented version
const IMMUTABLE_CACHE_NAME = 'product-catalogue-immutable-v4'; // Incremented version

// APP_SHELL_URLS should include the root path to ensure index.html is cached correctly for navigation.
const APP_SHELL_URLS = [
  './',
  './index.html',
  './manifest.json',
  './index.css',
  // Local scripts and components - no need to list every file, the build process handles this
  './index.tsx',
  './App.tsx',
];

const IMMUTABLE_URLS = [
  // CDNs
  'https://cdn.tailwindcss.com?plugins=typography',
  'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',
  'https://cdn.jsdelivr.net/npm/marked/marked.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/dompurify/3.0.9/purify.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  // esm.sh dependencies from importmap
  'https://esm.sh/react@^19.1.1',
  'https://esm.sh/react-dom@^19.1.1/client', // This might be needed depending on how react-dom is imported
  'https://esm.sh/react-dom@^19.1.1/',
  'https://esm.sh/react-router-dom@^7.8.1',
  'https://esm.sh/framer-motion@^12.23.12',
  'https://esm.sh/idb@^8.0.3',
  'https://esm.sh/jszip@^3.10.1',
  'https://esm.sh/pdfjs-dist@^5.4.54',
  'https://esm.sh/react-pageflip@^2.0.3',
  'https://esm.sh/swiper@^11.2.10/element/bundle',
  // Fonts
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap',
  'https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700;800;900&display=swap',
  'https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800;900&display=swap',
  'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@300;400;500;600;700;800;900&display=swap'
];


self.addEventListener('install', event => {
  console.log('Service Worker: Installing...');
  event.waitUntil(
    Promise.all([
        caches.open(CACHE_NAME).then(cache => {
            console.log('Service Worker: Caching App Shell');
            // Using reload to bypass browser cache during installation
            const requests = APP_SHELL_URLS.map(url => new Request(url, { cache: 'reload' }));
            return cache.addAll(requests);
        }),
        caches.open(IMMUTABLE_CACHE_NAME).then(cache => {
            console.log('Service Worker: Caching immutable assets');
            return cache.addAll(IMMUTABLE_URLS.map(url => new Request(url, { mode: 'cors' })));
        })
    ]).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  console.log('Service Worker: Activating...');
  const cacheWhitelist = [CACHE_NAME, IMMUTABLE_CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (!cacheWhitelist.includes(cacheName)) {
            console.log('Service Worker: Deleting old cache', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
    const { request } = event;

    // Only handle GET requests
    if (request.method !== 'GET') {
        return;
    }

    const url = new URL(request.url);

    // For immutable assets (CDNs, fonts), use a cache-first strategy
    if (IMMUTABLE_URLS.some(immutableUrl => url.href.startsWith(immutableUrl)) || url.hostname.startsWith('fonts.gstatic.com')) {
        event.respondWith(
            caches.open(IMMUTABLE_CACHE_NAME).then(cache => {
                return cache.match(request).then(response => {
                    return response || fetch(request).then(networkResponse => {
                        cache.put(request, networkResponse.clone());
                        return networkResponse;
                    });
                });
            })
        );
        return;
    }
    
    // For navigation requests (e.g., opening the app, refreshing, or navigating to a new page),
    // use a network-first strategy with a robust fallback to the cached app shell.
    // This is crucial for Single-Page Applications (SPAs) to handle deep links correctly.
    if (request.mode === 'navigate') {
        event.respondWith(
            (async () => {
                try {
                    // Try to fetch from the network first.
                    const networkResponse = await fetch(request);
                    if (networkResponse.ok) {
                        // If successful, update the cache and return the response.
                        const cache = await caches.open(CACHE_NAME);
                        cache.put(request, networkResponse.clone());
                        return networkResponse;
                    }
                    // If the server returns an error (e.g., 404 for an SPA route),
                    // we'll fall through to the cache fallback.
                } catch (error) {
                    // This catches network errors (e.g., when the user is offline).
                    console.log('Fetch for navigation failed, will fall back to cache.', error);
                }

                // Fallback to serving index.html from the cache. This handles both
                // offline access and server-side 404s for client-side routes.
                const cache = await caches.open(CACHE_NAME);
                // Return the cached index.html, which is the entry point for the SPA.
                const cachedResponse = await cache.match('./index.html');
                return cachedResponse;
            })()
        );
        return;
    }

    // For all other assets (app shell, local components), use a network-first strategy
    event.respondWith(
        caches.open(CACHE_NAME).then(cache => {
            return fetch(request)
                .then(networkResponse => {
                    if (networkResponse.ok) {
                        cache.put(request, networkResponse.clone());
                    }
                    return networkResponse;
                })
                .catch(() => {
                    return cache.match(request);
                });
        })
    );
});