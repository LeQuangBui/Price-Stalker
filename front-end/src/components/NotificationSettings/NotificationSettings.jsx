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
      <div className="flex flex-col items-start gap-4 sm:flex-row sm:justify-between">
        {/* `min-w-0` so this column can give way to the button when they share a line, and
            `flex-col` until `sm:` so that on a phone they do not have to. A row of prose beside a
            button has no good answer at 320px: whoever wins, the description ends up a column of
            single words. Stacked, it gets the card's full width.

            `sm:` and not a max-width query, deliberately — Tailwind v4's breakpoints are rem, and
            rem in a media query resolves against the reader's BROWSER default, not the root
            element. So the stack holds to 640px at a 16px default and to 960px at 24px: the
            threshold moves with the reader, which is the whole rule this phase keeps relearning.

            Not `flex-wrap`. Flex line breaking measures each item UNWRAPPED, so this description's
            max-content would drop the button onto its own line at every width under ~700px,
            desktop included — the same trap `.page-error` fell into in slice 2b-i. */}
        <div className="min-w-0">
          <h3 className="text-base font-bold text-[var(--text-primary)]">Price-drop notifications</h3>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Get a browser notification the moment a price you track drops — even with the tab closed.
          </p>
        </div>
        {supported && (
          // The house button. Hand-rolled, this was 77.77x36 — the only sub-44px control left
          // inside `<main>` on /profile, a page the responsive rework otherwise clears. `.btn`
          // carries the 44px floor, the 14px type, the padding and the colour transition, so the
          // utilities that used to spell all of that out are gone with it, along with six raw
          // `var(--…)` values the two role classes already own.
          //
          // No `shrink-0`. Paired with the default `min-width: auto` it made the button
          // incompressible, and at 320px with a 24px browser default that set a 375.95px right
          // edge — 71px past the viewport — on a card that fits.
          //
          // `min-h-11` for the same reason the two action links on this page carry it: `.btn`'s
          // floor is a flat 44px, and the box this replaces was rem-sized and reached 54px at a
          // 24px default. Landing on 44 there would hand the readers with the largest type the
          // smallest target they have had. 2.75rem keeps it growing with them — 44px, then 66px.
          <button
            type="button"
            onClick={subscribed ? disable : enable}
            disabled={busy || permission === 'denied'}
            aria-pressed={subscribed}
            aria-busy={busy}
            className={`btn min-h-11 ${subscribed ? 'btn-secondary' : 'btn-primary'}`}
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
