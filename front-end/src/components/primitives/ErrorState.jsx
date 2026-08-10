import { cx } from '../../lib/cx'

// Inline page error with an optional Retry. Shared by the pages that used the identical
// `.page-error` + `.retry-btn` block (ProductDetail, UserProfile, Bookmarks, Home).
// `role="alert"`, the other half of the pair EmptyState carries. Same silence to fix — the loading
// state is announced and the outcome is not — but a failed fetch is worth interrupting for, and it
// arrives with a Retry the reader has to know exists to reach.
export default function ErrorState({ message, onRetry, className }) {
  return (
    <div className={cx('page-error', className)} role="alert">
      <span>{message}</span>
      {onRetry ? (
        <button type="button" className="retry-btn" onClick={onRetry}>
          Retry
        </button>
      ) : null}
    </div>
  )
}
