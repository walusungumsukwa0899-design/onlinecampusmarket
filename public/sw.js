// Wolf Marketplace service worker
// Keeps the app installable and caches the static app shell so the UI
// still loads (offline-friendly chrome) even with a flaky campus connection.
// Live data (products, vendors, etc.) always goes to the network — this
// does NOT cache or serve stale Supabase API responses.

const CACHE_NAME = 'wolf-market-shell-v2'
const APP_SHELL = [
  '/',
  '/manifest.webmanifest',
  '/icon-192.png',
  '/icon-512.png',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Never intercept API calls (Supabase, etc.) — always go to network.
  if (url.origin !== self.location.origin) return
  if (request.method !== 'GET') return

  // Network-first for navigations so users always see fresh content when online,
  // falling back to the cached shell only when offline.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match('/'))
    )
    return
  }

  // Cache-first for static shell assets.
  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request))
  )
})
