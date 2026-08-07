/* eslint-env serviceworker */
/* global clients */
// Custom Web Push service worker (E4), compiled by vite-plugin-pwa (injectManifest).
// Responsibilities: precache the app shell, show OS notifications on `push`, and open the
// target product page on `notificationclick`. All navigation is same-origin only (H7).
import { clientsClaim } from 'workbox-core'
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching'

// registerType:'autoUpdate' -> take control of open tabs as soon as a new SW activates.
self.skipWaiting()
clientsClaim()

cleanupOutdatedCaches()
precacheAndRoute(self.__WB_MANIFEST || [])

const FALLBACK_URL = '/'
const ICON = '/icon.svg'

// Only ever navigate to a same-origin path. The payload carries a relative app route
// (e.g. "/products/abc"); anything else falls back to the app root (defense in depth, H7).
function safeUrl(raw) {
  if (typeof raw !== 'string' || !raw.startsWith('/') || raw.startsWith('//')) {
    return FALLBACK_URL
  }
  return raw
}

self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    data = {}
  }
  const title = typeof data.title === 'string' && data.title.trim() ? data.title : 'Price Stalker'
  const url = safeUrl(data.url)
  const options = {
    body: typeof data.body === 'string' ? data.body : '',
    icon: ICON,
    badge: ICON,
    tag: url,             // collapse repeat notifications for the same product
    data: { url },
    actions: [{ action: 'view', title: 'View product' }],
  }
  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = safeUrl(event.notification.data && event.notification.data.url)
  // Both the body click and the "View product" action open the same product page.
  event.waitUntil(
    (async () => {
      const windows = await clients.matchAll({ type: 'window', includeUncontrolled: true })
      // Prefer a tab already on the target page — just focus it, don't navigate it away.
      for (const client of windows) {
        try {
          if ('focus' in client && new URL(client.url).pathname === url) {
            return client.focus()
          }
        } catch {
          // Opaque / unparseable client.url — fall through.
        }
      }
      // Otherwise focus the first window and navigate it to the target.
      for (const client of windows) {
        if ('focus' in client) {
          await client.focus()
          if ('navigate' in client) {
            try {
              await client.navigate(url)
            } catch {
              // Cross-origin or detached client — ignore; focus already happened.
            }
          }
          return
        }
      }
      if (clients.openWindow) {
        await clients.openWindow(url)
      }
    })()
  )
})
