import { useCallback, useEffect, useState } from 'react'
import {
  deleteSubscription,
  getVapidPublicKey,
  saveSubscription,
  sendTestPush,
  urlBase64ToUint8Array,
} from '../api/push'

export function isPushSupported() {
  return (
    typeof navigator !== 'undefined' &&
    'serviceWorker' in navigator &&
    typeof window !== 'undefined' &&
    'PushManager' in window &&
    'Notification' in window
  )
}

// navigator.serviceWorker.ready never resolves if the SW fails to register/activate, which would
// hang the busy spinner forever. Race it against a timeout so the UI always recovers.
function serviceWorkerReady(timeoutMs = 10000) {
  let timer
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error('Service worker is not ready (timed out).')), timeoutMs)
  })
  return Promise.race([navigator.serviceWorker.ready, timeout]).finally(() => clearTimeout(timer))
}

/**
 * Encapsulates the browser Web Push lifecycle: feature detection, permission, subscribe /
 * unsubscribe (synced to the backend), and the "send test" trigger. Degrades gracefully —
 * when push is unsupported the hook reports `supported: false` and does nothing else.
 */
export function usePushNotifications() {
  const supported = isPushSupported()
  const [permission, setPermission] = useState(
    supported ? Notification.permission : 'unsupported'
  )
  const [subscribed, setSubscribed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')

  // Reflect the actual browser subscription state on mount.
  useEffect(() => {
    if (!supported) return
    let cancelled = false
    ;(async () => {
      try {
        const reg = await serviceWorkerReady()
        const sub = await reg.pushManager.getSubscription()
        if (!cancelled) setSubscribed(!!sub)
      } catch {
        // No registration yet / SW unavailable — treat as not subscribed.
        if (!cancelled) setSubscribed(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [supported])

  const enable = useCallback(async () => {
    if (!supported || busy) return
    setBusy(true)
    setError('')
    setInfo('')
    try {
      const result = await Notification.requestPermission()
      setPermission(result)
      if (result !== 'granted') {
        setError(
          result === 'denied'
            ? 'Notifications are blocked. Enable them for this site in your browser settings.'
            : 'Notification permission was not granted.'
        )
        return
      }
      const key = await getVapidPublicKey()
      if (!key) {
        setError('Push notifications are not configured on the server yet.')
        return
      }
      const reg = await serviceWorkerReady()
      let sub = await reg.pushManager.getSubscription()
      const createdNew = !sub
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(key),
        })
      }
      try {
        await saveSubscription(sub)
      } catch (saveErr) {
        // Don't leave an orphan browser subscription the backend never recorded: roll back the
        // one we just created so the browser and server stay consistent.
        if (createdNew) {
          try { await sub.unsubscribe() } catch { /* best-effort rollback */ }
        }
        throw saveErr
      }
      setSubscribed(true)
      setInfo('Price-drop notifications are on for this device.')
    } catch (err) {
      setError(err?.message || 'Could not enable notifications.')
    } finally {
      setBusy(false)
    }
  }, [supported, busy])

  const disable = useCallback(async () => {
    if (!supported || busy) return
    setBusy(true)
    setError('')
    setInfo('')
    try {
      const reg = await serviceWorkerReady()
      const sub = await reg.pushManager.getSubscription()
      if (sub) {
        // The server row is the source of truth for sending, so delete it first. unsubscribe() is
        // local + idempotent and best-effort — if it throws, the server row is already gone so the
        // UI must still flip to "off" (else it would wrongly show "on" with no server row).
        await deleteSubscription(sub.endpoint)
        try { await sub.unsubscribe() } catch { /* best-effort; server row already removed */ }
      }
      setSubscribed(false)
      setInfo('Notifications turned off for this device.')
    } catch (err) {
      setError(err?.message || 'Could not turn off notifications.')
    } finally {
      setBusy(false)
    }
  }, [supported, busy])

  const sendTest = useCallback(async () => {
    if (!supported || busy) return
    setBusy(true)
    setError('')
    setInfo('')
    try {
      await sendTestPush()
      setInfo('Test notification sent — it should arrive shortly.')
    } catch (err) {
      setError(
        err?.status === 429
          ? 'Please wait a moment before sending another test.'
          : err?.message || 'Could not send a test notification.'
      )
    } finally {
      setBusy(false)
    }
  }, [supported, busy])

  return { supported, permission, subscribed, busy, error, info, enable, disable, sendTest }
}
