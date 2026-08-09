import { cx } from '../../lib/cx'

// Inline page error with an optional Retry. Shared by the pages that used the identical
// `.page-error` + `.retry-btn` block (ProductDetail, UserProfile, Bookmarks, Home).
export default function ErrorState({ message, onRetry, className }) {
  return (
    <div className={cx('page-error', className)}>
      <span>{message}</span>
      {onRetry ? (
        <button type="button" className="retry-btn" onClick={onRetry}>
          Retry
        </button>
      ) : null}
    </div>
  )
}
