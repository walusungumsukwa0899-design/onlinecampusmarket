// Wolf Marketplace Service Worker v8.0.0
const CACHE_NAME = 'wolf-market-v8'
const OFFLINE_URL = '/offline.html'

// Only cache static assets at install, NOT the HTML shell
// (HTML must always come from network to pick up new JS bundles)
const STATIC_ASSETS = [
  '/offline.html',
  '/manifest.webmanifest',
  '/icon-192.png',
  '/icon-512.png',
]

// Install: cache only static assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  )
})

// Activate: clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

// Fetch: network first for navigation (HTML), cache first for static assets
self.addEventListener('fetch', event => {
  const { request } = event
  const url = new URL(request.url)

  // Skip non-GET and cross-origin requests
  if (request.method !== 'GET') return
  if (url.hostname.includes('supabase.co') || url.hostname.includes('paychangu.com')) return

  // HTML navigation: ALWAYS network first, fall back to offline page
  // Never serve cached HTML — it could be a stale blank page
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .catch(() => caches.match(OFFLINE_URL))
    )
    return
  }

  // JS/CSS/image assets: cache first, then network
  if (url.pathname.match(/\.(js|css|png|jpg|webp|svg|ico|woff2?)$/)) {
    event.respondWith(
      caches.match(request).then(cached => {
        if (cached) return cached
        return fetch(request).then(response => {
          if (response.ok) {
            caches.open(CACHE_NAME).then(cache => cache.put(request, response.clone()))
          }
          return response
        })
      }).catch(() => caches.match(OFFLINE_URL))
    )
    return
  }

  // Everything else: network only
  event.respondWith(fetch(request).catch(() => caches.match(OFFLINE_URL)))
})
