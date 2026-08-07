import { apiRequest } from './client'

/** GET the server's VAPID public key (base64url). Public — no auth needed. */
export async function getVapidPublicKey() {
  const data = await apiRequest('/push/vapid-public-key', { auth: false })
  return data?.publicKey || ''
}

/**
 * Persist a browser PushSubscription against the logged-in user. Accepts the raw
 * PushSubscription (uses .toJSON() for endpoint + keys). Returns null (204).
 */
export function saveSubscription(subscription) {
  const json = subscription.toJSON()
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
    // The server would reject this with 400; fail early with a clearer message.
    return Promise.reject(new Error('This browser did not provide a complete push subscription.'))
  }
  return apiRequest('/push/subscriptions', {
    method: 'POST',
    body: {
      endpoint: json.endpoint,
      keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
    },
  })
}

/** Remove a subscription (scoped server-side to the caller). Returns null (204). */
export function deleteSubscription(endpoint) {
  return apiRequest('/push/subscriptions', {
    method: 'DELETE',
    body: { endpoint },
  })
}

/** Ask the backend to send a test push to the caller's own devices. 202, or 429 if rate-limited. */
export function sendTestPush() {
  return apiRequest('/push/test', { method: 'POST' })
}

/**
 * Convert a base64url VAPID key to the Uint8Array `applicationServerKey` that
 * PushManager.subscribe requires (H9). base64url -> base64 -> raw bytes.
 */
export function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const output = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i += 1) {
    output[i] = raw.charCodeAt(i)
  }
  return output
}
