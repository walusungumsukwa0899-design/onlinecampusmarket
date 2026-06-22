// Wolf Marketplace service worker
// Keeps the app installable and caches the static app shell so the UI
// still loads (offline-friendly chrome) even with a flaky campus connection.
// Live data (products, vendors, etc.) always goes to the network — this
// does NOT cache or serve stale Supabase API responses.

const CACHE_NAME = 'wolf-market-shell-v2'
const OFFLINE_CACHE = 'wolf-offline-v1'
const APP_SHELL = [
  '/',
  '/manifest.webmanifest',
  '/icon-192.png',
  '/icon-512.png',
]

// FIX: Merged both duplicate 'install' listeners into one.
// The previous file had two install listeners — the second one overwrote
// the first, meaning APP_SHELL was never cached on install.
self.addEventListener('install', (event) => {
  event.waitUntil(
    Promise.all([
      caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)),
      caches.open(OFFLINE_CACHE).then((cache) => cache.add('/offline.html')),
    ])
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME && key !== OFFLINE_CACHE)
          .map((key) => caches.delete(key))
      )
    )
  )
  self.clients.claim()
})

// FIX: Merged both duplicate 'fetch' listeners into one.
// The previous file had two fetch listeners. In service workers, both run
// but the second one's respondWith() call on navigate requests was racing
// with the first — causing unpredictable offline fallback behaviour.
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Never intercept API calls (Supabase, etc.) — always go to network.
  if (url.origin !== self.location.origin) return
  if (request.method !== 'GET') return

  // Network-first for navigations, falling back to offline.html when offline.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() =>
        caches.match(request).then((cached) => cached || caches.match('/offline.html'))
      )
    )
    return
  }

  // Cache-first for static shell assets.
  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request))
  )
})

// Handle incoming push notifications
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
