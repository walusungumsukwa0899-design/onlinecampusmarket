// Wolf Marketplace Service Worker
// Caches app shell for offline-friendly PWA experience on campus networks.

const CACHE_NAME = 'wolf-market-v3'
const OFFLINE_URL = '/offline.html'

const APP_SHELL = [
  '/',
  '/home',
  '/offline.html',
  '/manifest.webmanifest',
  '/icon-192.png',
  '/icon-512.png',
]

// Install: cache app shell + offline page
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
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

// Fetch: network first for API/Supabase, cache first for assets
self.addEventListener('fetch', event => {
  const { request } = event
  const url = new URL(request.url)

  // Skip non-GET and cross-origin Supabase/PayChangu requests
  if (request.method !== 'GET') return
  if (url.hostname.includes('supabase.co') || url.hostname.includes('paychangu.com')) return

  // HTML navigation: network first, fall back to offline page
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .catch(() => caches.match(OFFLINE_URL))
    )
    return
  }

  // Assets: cache first, then network
  event.respondWith(
    caches.match(request)
      .then(cached => cached || fetch(request).then(response => {
        // Cache successful responses for static assets
        if (response.ok && (url.pathname.match(/\.(js|css|png|jpg|webp|svg|ico|woff2?)$/))) {
          caches.open(CACHE_NAME).then(cache => cache.put(request, response.clone()))
        }
        return response
      }))
      .catch(() => caches.match(OFFLINE_URL))
  )
})
