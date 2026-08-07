import { cx } from '../../lib/cx'

// Previous / Page X of Y / Next. Renders nothing for a single page. Shared by Home, Alerts,
// Bookmarks (was duplicated verbatim in all three).
export default function Pagination({ page, totalPages, onPrev, onNext, className }) {
  if (totalPages <= 1) return null
  return (
    <div className={cx('pagination', className)}>
      <button type="button" onClick={onPrev} disabled={page === 0}>
        Previous
      </button>
      <span className="pagination-info">
        Page {page + 1} of {totalPages}
      </span>
      <button type="button" onClick={onNext} disabled={page >= totalPages - 1}>
        Next
      </button>
    </div>
  )
}
