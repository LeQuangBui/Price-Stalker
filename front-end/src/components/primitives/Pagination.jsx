import { cx } from '../../lib/cx'

// Previous / Page X of Y / Next. Renders nothing for a single page. Shared by Home, Alerts and
// Bookmarks. Self-contained on purpose: it used to depend on `.pagination` rules living in
// Home.css AND Bookmarks.css, which meant /alerts — which imports neither — was styled entirely
// by bundle-order leakage, and Bookmarks' `border: none` silently stripped Home's border app-wide.
const BUTTON = [
  'inline-flex min-h-11 items-center justify-center',
  'rounded-[var(--radius-sm)] border border-[color-mix(in_srgb,var(--primary)_42%,var(--border))]',
  'bg-oxblood px-5 py-2.5 text-sm font-semibold text-white',
  'shadow-[var(--shadow-sm)] transition-colors',
  'enabled:hover:bg-oxblood-deep',
  'disabled:cursor-not-allowed disabled:border-transparent disabled:bg-tertiary disabled:text-ink-mute',
].join(' ')

export default function Pagination({ page, totalPages, onPrev, onNext, className }) {
  if (totalPages <= 1) return null
  return (
    <div className={cx('mt-8 flex items-center justify-center gap-4', className)}>
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
