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

// Handle incoming push notifications
// Offline fallback — cache offline.html during install
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open('wolf-offline-v1').then(cache => cache.add('/offline.html'))
  )
  self.skipWaiting()
})

self.addEventListener('fetch', (event) => {
  // Only intercept navigation requests (page loads), not API calls
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() =>
        caches.match('/offline.html')
      )
    )
  }
})

self.addEventListener('push', (event) => {
  if (!event.data) return
  let data = {}
  try { data = event.data.json() } catch { data = { title: 'Wolf Marketplace', body: event.data.text() } }
  event.waitUntil(
    self.registration.showNotification(data.title || 'Wolf Marketplace', {
      body: data.body || '',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      data: { url: data.url || '/' },
    })
  )
})

// Open the relevant page when notification is tapped
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      const url = event.notification.data?.url || '/'
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url)
          return client.focus()
        }
      }
      if (clients.openWindow) return clients.openWindow(url)
    })
  )
})
