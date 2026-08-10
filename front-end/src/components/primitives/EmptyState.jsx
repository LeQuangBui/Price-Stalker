import { cx } from '../../lib/cx'

// Shared "nothing to show" panel. Wraps the layered `.empty-state` rules in index.css rather than
// re-implementing them, so a caller's utilities still win — `@layer base` loses to `@layer
// utilities`. Used by ProductList and UserProfile, and by Bookmarks from the second half of slice
// 2b-ii. Alerts.jsx:174 still hand-rolls the same markup and should move over when that page is
// converted.
// `role="status"`, because every page that uses this announces its LOADING state and then goes
// silent. A screen reader hears "Loading bookmarks…" and then nothing at all — the result of the
// fetch is the one thing it never says. `status` and not `alert`: an empty list is an outcome, not
// a problem, and `alert` is assertive enough to interrupt.
export default function EmptyState({ title, children, action, className }) {
  return (
    <div className={cx('empty-state', className)} role="status">
      <h3>{title}</h3>
      {children ? <p>{children}</p> : null}
      {action}
    </div>
  )
}
