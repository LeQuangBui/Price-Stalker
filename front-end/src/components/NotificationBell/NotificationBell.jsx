import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { getNotifications } from '../../api/notifications'
import { formatDateTime } from '../../utils/formatters'

/**
 * Read-only in-app notification bell (header). Lists the most recent price-drop events for the
 * logged-in user (one row per drop, server-deduped). Doubles as the graceful fallback when
 * browser push is denied or unsupported — the alerts still surface here.
 */
export default function NotificationBell() {
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const containerRef = useRef(null)

  // Refetch every time the bell opens so newly-arrived drops appear (this is the fallback surface
  // when push is denied/unsupported — caching once would make it permanently stale).
  useEffect(() => {
    if (!open) return
    let cancelled = false
    setLoading(true)
    setError('')
    getNotifications({ size: 10 })
      .then((data) => { if (!cancelled) setItems(data) })
      .catch((err) => { if (!cancelled) setError(err.message || 'Could not load notifications') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [open])

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

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex h-9 w-9 items-center justify-center rounded-xl text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-secondary)]"
        aria-label="Notifications"
        aria-haspopup="true"
        aria-expanded={open}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="18" height="18" aria-hidden="true">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
      </button>

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
