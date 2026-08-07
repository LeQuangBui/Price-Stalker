import { usePushNotifications } from '../../push/usePushNotifications'

/**
 * Enable / disable price-drop web-push for this device + a "send test" action. Lives on the
 * profile page. Degrades gracefully: when the browser can't do push, it explains why instead
 * of showing a dead control.
 */
export default function NotificationSettings() {
  const { supported, permission, subscribed, busy, error, info, enable, disable, sendTest } =
    usePushNotifications()

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-primary)] p-5 shadow-[var(--shadow-sm)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-[var(--text-primary)]">Price-drop notifications</h3>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Get a browser notification the moment a price you track drops — even with the tab closed.
          </p>
        </div>
        {supported && (
          <button
            type="button"
            onClick={subscribed ? disable : enable}
            disabled={busy || permission === 'denied'}
            aria-pressed={subscribed}
            aria-busy={busy}
            className={`shrink-0 rounded-xl px-4 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
              subscribed
                ? 'border border-[var(--border)] bg-[var(--bg-secondary)] text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'
                : 'bg-[var(--primary)] text-white hover:bg-[var(--primary-dark)]'
            }`}
          >
            {busy ? 'Working…' : subscribed ? 'Turn off' : 'Enable'}
          </button>
        )}
      </div>

      {supported && subscribed && (
        <div className="mt-4">
          <button
            type="button"
            onClick={sendTest}
            disabled={busy}
            className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-secondary)] disabled:opacity-60"
          >
            Send test notification
          </button>
        </div>
      )}

      {!supported && (
        <p className="mt-3 text-sm text-[var(--text-muted)]">
          This browser doesn’t support web-push notifications. On iPhone/iPad, add Price Stalker to
          your Home Screen first (iOS 16.4+).
        </p>
      )}

      {supported && permission === 'denied' && (
        <p className="mt-3 text-sm text-[var(--warning)]">
          Notifications are blocked for this site. Re-enable them in your browser’s site settings,
          then try again.
        </p>
      )}

      <div role="status" aria-live="polite">
        {error && <p className="mt-3 text-sm text-[var(--danger)]">{error}</p>}
        {info && <p className="mt-3 text-sm text-[var(--accent)]">{info}</p>}
      </div>
    </div>
  )
}
