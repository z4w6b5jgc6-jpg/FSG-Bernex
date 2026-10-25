// Service worker : rend l'app installable et utilisable avec un réseau faible.
// - fichiers de l'app (JS/CSS/icônes) : cache d'abord, mis à jour en arrière-plan
// - page HTML : réseau d'abord, cache si hors-ligne
// - données (Supabase) : jamais mises en cache ici
const CACHE = 'coach-athle-v9'

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(['./', './index.html', './manifest.webmanifest', './icon-192.png'])))
  self.skipWaiting()
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (e) => {
  const req = e.request
  const url = new URL(req.url)
  if (req.method !== 'GET' || url.origin !== self.location.origin) return
  // fonctions du serveur (/api/…) : toujours le réseau, jamais le cache
  if (url.pathname.startsWith('/api/')) return

  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone()
          caches.open(CACHE).then((c) => c.put('./index.html', copy))
          return res
        })
        .catch(() => caches.match('./index.html')),
    )
    return
  }

  e.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req).then((res) => {
        if (res.ok) {
          const copy = res.clone()
          caches.open(CACHE).then((c) => c.put(req, copy))
        }
        return res
      })
      return cached || network
    }),
  )
})

// Notifications : aucun contenu n'est transmis (confidentialité), on invite à ouvrir l'app
self.addEventListener('push', (e) => {
  e.waitUntil(self.registration.showNotification('FSG Bernex – entraînement', {
    body: 'Nouveau message ou retour de séance. Ouvre l’app pour le lire.',
    icon: './icon-192.png',
    badge: './icon-192.png',
    tag: 'messages',
    renotify: true,
  }))
})

self.addEventListener('notificationclick', (e) => {
  e.notification.close()
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
    const open = list.find((c) => 'focus' in c)
    if (open) { open.navigate?.('./#/messages'); return open.focus() }
    return self.clients.openWindow('./#/messages')
  }))
})
