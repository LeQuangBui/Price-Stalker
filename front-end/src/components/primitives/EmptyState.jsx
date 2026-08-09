import { cx } from '../../lib/cx'

// Shared "nothing to show" panel. Wraps the layered `.empty-state` rules in index.css rather than
// re-implementing them, so a caller's utilities still win — `@layer base` loses to `@layer
// utilities`. Replaces the hand-rolled versions in ProductList, Home, Bookmarks and Alerts.
export default function EmptyState({ title, children, action, className }) {
  return (
    <div className={cx('empty-state', className)}>
      <h3>{title}</h3>
      {children ? <p>{children}</p> : null}
      {action}
    </div>
  )
}
