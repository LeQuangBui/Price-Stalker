import { cx } from '../../lib/cx'

// Previous / Page X of Y / Next. Renders nothing for a single page. Shared by Home, Alerts and
// Bookmarks. Self-contained on purpose: it used to depend on `.pagination` rules living in
// Home.css AND Bookmarks.css, which meant /alerts — which imports neither — was styled entirely
// by bundle-order leakage, and Bookmarks' `border: none` silently stripped Home's border app-wide.
const BUTTON = [
  'inline-flex min-h-11 cursor-pointer items-center justify-center',
  'rounded-[var(--radius-sm)] border border-[color-mix(in_srgb,var(--primary)_42%,var(--border))]',
  'bg-oxblood px-5 py-2.5 text-sm font-semibold text-white',
  // `transition`, not `transition-colors` — the hover lift and shadow below are transform and
  // box-shadow, which transition-colors does not animate.
  'shadow-[var(--shadow-sm)] transition',
  'enabled:hover:bg-oxblood-deep enabled:hover:-translate-y-px enabled:hover:shadow-[var(--shadow)]',
  'disabled:cursor-not-allowed disabled:border-transparent disabled:bg-tertiary disabled:text-ink-mute',
].join(' ')

export default function Pagination({ page, totalPages, onPrev, onNext, className }) {
  if (totalPages <= 1) return null
  return (
    // flex-wrap is safe HERE and was a documented regression on `.page-error`: line breaking uses
    // each item's unwrapped width, which for prose meant a long message threw the button to its
    // own row on desktop. These three items are fixed-content, so their unwrapped width IS their
    // width — the row wraps exactly when it genuinely cannot fit, which is a 320px viewport at a
    // raised browser font (measured 47px of page overflow at root 24 before this), and never on
    // desktop.
    <div className={cx('mt-8 flex flex-wrap items-center justify-center gap-4', className)}>
      <button type="button" onClick={onPrev} disabled={page === 0} className={BUTTON}>
        Previous
      </button>
      <span className="px-4 py-2.5 font-medium text-ink-soft">
        Page {page + 1} of {totalPages}
      </span>
      <button type="button" onClick={onNext} disabled={page >= totalPages - 1} className={BUTTON}>
        Next
      </button>
    </div>
  )
}
