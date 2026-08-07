import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { getNotifications } from '../../api/notifications'
import { formatDateTime } from '../../utils/formatters'

const LAST_SEEN_KEY = 'notif_last_seen_at'
const STALE_MS = 30_000

function readLastSeen() {
  try {
    return Number(localStorage.getItem(LAST_SEEN_KEY)) || 0
  } catch {
    return 0
  }
}

function writeLastSeen(ts) {
  try {
    localStorage.setItem(LAST_SEEN_KEY, String(ts))
  } catch {
    /* storage unavailable — pulse just won't persist across reloads */
  }
}

function newestTimestamp(list) {
  return list.reduce((max, n) => {
    const t = new Date(n.sentAt).getTime()
    return Number.isFinite(t) && t > max ? t : max
  }, 0)
}

/**
 * Read-only in-app notification bell (header). Lists the most recent price-drop events for the
 * logged-in user, and pulses when a drop has arrived since the bell was last opened. Doubles as
 * the graceful fallback when browser push is denied.
 */
export default function NotificationBell() {
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [hasNew, setHasNew] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const fetchedAtRef = useRef(0)
  const containerRef = useRef(null)

  // Background probe: best-effort (suppressAuthRedirect) so an indicator fetch the user never
  // initiated can't yank them to /login on a dead token. Seeds the list + the pulse.
  const probe = useCallback(async () => {
    try {
      const data = await getNotifications({ size: 10, suppressAuthRedirect: true })
      setItems(data)
      setLoaded(true)
      fetchedAtRef.current = Date.now()
      setHasNew(newestTimestamp(data) > readLastSeen())
    } catch {
      /* indicator only — stay silent */
    }
  }, [])

  // Foreground refresh (when the user opens) — NOT suppressed, so a dead session logs out.
  const refresh = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await getNotifications({ size: 10 })
      setItems(data)
      setLoaded(true)
      fetchedAtRef.current = Date.now()
    } catch (err) {
      setError(err.message || 'Could not load notifications')
    } finally {
      setLoading(false)
    }
  }, [])

  // Probe on mount and whenever the tab regains focus, so drops arriving mid-session light the bell.
  useEffect(() => {
    probe()
    const onFocus = () => probe()
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [probe])

  // On open, refresh only if the cached list is stale (avoids a redundant round trip right after
  // the mount probe).
  useEffect(() => {
    if (!open) return
    if (!loaded || Date.now() - fetchedAtRef.current > STALE_MS) {
      refresh()
    }
  }, [open, loaded, refresh])

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpen(false)
      }
    }
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  const handleToggle = () => {
    const next = !open
    setOpen(next)
    if (next) {
      // Side effects live in the handler, not the state updater (which must stay pure).
      setHasNew(false)
      writeLastSeen(Date.now())
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={handleToggle}
        className="flex h-9 w-9 items-center justify-center rounded-xl text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-secondary)]"
        aria-label={hasNew ? 'Notifications (new)' : 'Notifications'}
        aria-haspopup="true"
        aria-expanded={open}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="18" height="18" aria-hidden="true">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
      </button>

      {hasNew && (
        <span className="pointer-events-none absolute right-1.5 top-1.5 flex h-2.5 w-2.5" aria-hidden="true">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-oxblood opacity-75"></span>
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full border-2 border-paper bg-oxblood"></span>
        </span>
      )}

      {open && (
        <div className="absolute right-0 top-12 z-50 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-primary)] shadow-[var(--shadow-lg)]">
          <div className="border-b border-[var(--border)] px-4 py-3">
            <span className="text-sm font-bold text-[var(--text-primary)]">Notifications</span>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {loading && (
              <p className="px-4 py-6 text-center text-sm text-[var(--text-muted)]">Loading…</p>
            )}
            {!loading && error && (
              <p className="px-4 py-6 text-center text-sm text-[var(--danger)]">{error}</p>
            )}
            {!loading && !error && items.length === 0 && (
              <p className="px-4 py-6 text-center text-sm text-[var(--text-muted)]">
                No price-drop notifications yet.
              </p>
            )}
            {!loading && !error &&
              items.map((item) => {
                const body = (
                  <>
                    <span className="block text-sm font-semibold text-[var(--text-primary)]">
                      {item.productName || 'A tracked product'}
                    </span>
                    <span className="mt-0.5 block text-xs text-[var(--text-muted)]">
                      Price dropped · {formatDateTime(item.sentAt)}
                    </span>
                  </>
                )
                return item.productId ? (
                  <Link
                    key={item.eventId}
                    to={`/products/${item.productId}`}
                    onClick={() => setOpen(false)}
                    className="block border-b border-[var(--border-light)] px-4 py-3 transition-colors hover:bg-[var(--bg-secondary)] last:border-b-0"
                  >
                    {body}
                  </Link>
                ) : (
                  <div key={item.eventId} className="block border-b border-[var(--border-light)] px-4 py-3 last:border-b-0">
                    {body}
                  </div>
                )
              })}
          </div>
        </div>
      )}
    </div>
  )
}
