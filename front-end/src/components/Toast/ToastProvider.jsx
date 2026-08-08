import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'

const ToastContext = createContext(null)

/**
 * useToast().toast(message, { type }) — type is 'info' | 'success' | 'error'.
 * Returns a no-op when used outside a provider so isolated component tests don't
 * need the provider wrapper.
 */
export function useToast() {
  const ctx = useContext(ToastContext)
  return ctx || { toast: () => {}, dismiss: () => {} }
}

let idSeq = 0

const ACCENT = {
  info: 'var(--text-secondary)',
  success: 'var(--accent)',
  error: 'var(--danger)',
}

/**
 * `offsetForTabBar` lifts the toast host clear of the fixed bottom TabBar. TabBar only renders
 * when signed in, so signed-out pages must not reserve the space — otherwise toasts float ~72px
 * above nothing. RootLayout is the only mount point and already owns the signed-in flag, so it
 * passes it down rather than either side reading auth state twice.
 */
export function ToastProvider({ children, duration = 3500, offsetForTabBar = false }) {
  const [toasts, setToasts] = useState([])
  const timers = useRef(new Map())

  const dismiss = useCallback((id) => {
    setToasts((list) => list.filter((t) => t.id !== id))
    const timer = timers.current.get(id)
    if (timer) {
      clearTimeout(timer)
      timers.current.delete(id)
    }
  }, [])

  const toast = useCallback(
    (message, { type = 'info' } = {}) => {
      const id = (idSeq += 1)
      setToasts((list) => [...list, { id, message, type }])
      const timer = setTimeout(() => dismiss(id), duration)
      timers.current.set(id, timer)
      return id
    },
    [dismiss, duration]
  )

  // Clear any pending dismiss timers on unmount so they don't fire afterward.
  useEffect(() => {
    const pending = timers.current
    return () => {
      pending.forEach((t) => clearTimeout(t))
      pending.clear()
    }
  }, [])

  return (
    <ToastContext.Provider value={{ toast, dismiss }}>
      {children}
      <div
        className={[
          'pointer-events-none fixed right-4 flex flex-col gap-2',
          offsetForTabBar ? 'bottom-[calc(var(--shell-pb)+1rem)] md:bottom-4' : 'bottom-4',
        ].join(' ')}
        style={{ zIndex: 60 }}
        role="status"
        aria-live="polite"
      >
        {toasts.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => dismiss(t.id)}
            className="pointer-events-auto max-w-xs rounded-xl border border-line bg-paper px-4 py-3 text-left text-sm font-medium text-ink"
            style={{ boxShadow: 'var(--shadow)', borderLeft: `3px solid ${ACCENT[t.type] || ACCENT.info}` }}
          >
            {t.message}
          </button>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
