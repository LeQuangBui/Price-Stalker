import { cx } from '../../lib/cx'

// Shared "nothing to show" panel. Wraps the layered `.empty-state` rules in index.css rather than
// re-implementing them, so a caller's utilities still win — `@layer base` loses to `@layer
// utilities`. Used by ProductList, UserProfile, Bookmarks and Alerts, which was the last page
// hand-rolling the markup and moved over in slice 2b-iii. No hand-rolled copies remain.
// `role="status"`, because every page that uses this announces its LOADING state and then goes
// silent. A screen reader hears "Loading bookmarks…" and then nothing at all — the result of the
// fetch is the one thing it never says. `status` and not `alert`: an empty list is an outcome, not
// a problem, and `alert` is assertive enough to interrupt.
export default function EmptyState({ title, children, action, className, level = 3 }) {
  // The heading level belongs to the page, not the panel: this renders directly under an h1 on
  // Bookmarks and Alerts (level 2), under an h2 section on Home and /profile (the default 3), and
  // under the chart card's own h3 (level 4). index.css's rule was unkeyed from the h3 tag
  // (`.empty-state > :is(h2, h3, h4)`) so the size follows the panel, not the level.
  const Heading = `h${level}`
  return (
    <div className={cx('empty-state', className)} role="status">
      <Heading>{title}</Heading>
      {children ? <p>{children}</p> : null}
      {action}
    </div>
  )
}
