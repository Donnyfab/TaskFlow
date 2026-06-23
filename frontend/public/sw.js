const FORGE_CACHE = 'forge-shell-v1'
const FORGE_SHELL_URLS = [
  '/offline.html',
  '/manifest.webmanifest',
  '/icons/forge-icon.svg',
  '/icons/forge-maskable.svg',
]

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(FORGE_CACHE)
      .then(cache => cache.addAll(FORGE_SHELL_URLS))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== FORGE_CACHE).map(key => caches.delete(key))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', event => {
  const { request } = event

  if (request.method !== 'GET') return

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          const copy = response.clone()
          caches.open(FORGE_CACHE).then(cache => cache.put(request, copy))
          return response
        })
        .catch(() => caches.match(request).then(cached => cached || caches.match('/offline.html'))),
    )
    return
  }

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  event.respondWith(
    caches.match(request).then(cached => {
      const network = fetch(request)
        .then(response => {
          if (response.ok) {
            const copy = response.clone()
            caches.open(FORGE_CACHE).then(cache => cache.put(request, copy))
          }
          return response
        })
        .catch(() => cached)

      return cached || network
    }),
  )
})

self.addEventListener('push', event => {
  let payload = {}
  try {
    payload = event.data ? event.data.json() : {}
  } catch {
    payload = { body: event.data ? event.data.text() : '' }
  }

  const title = payload.title || 'Forge'
  const options = {
    body: payload.body || 'Your commitment is due today.',
    icon: '/icons/forge-icon.svg',
    badge: '/icons/forge-icon.svg',
    tag: payload.tag || 'forge-daily-commitment',
    data: {
      url: payload.url || '/ai',
    },
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', event => {
  event.notification.close()
  const url = event.notification.data && event.notification.data.url ? event.notification.data.url : '/ai'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      for (const client of clientList) {
        if ('focus' in client && client.url.includes(self.location.origin)) {
          client.navigate(url)
          return client.focus()
        }
      }
      return self.clients.openWindow(url)
    }),
  )
})
