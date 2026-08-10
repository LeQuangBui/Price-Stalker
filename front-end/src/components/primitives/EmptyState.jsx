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
      {/* Still h3 while its four consumers sit at three different depths, and while `.empty-state
          h3` in index.css keys the 20px size to the tag. Under /profile's Bookmarks h2 that reads
          correctly; on Bookmarks' own empty state it is an h1 -> h3 skip, the last one left on
          either page. Fixing it means a level prop AND unkeying that rule, which is a change to
          every consumer — not something to fold into a card-title promotion. */}
      <h3>{title}</h3>
      {children ? <p>{children}</p> : null}
      {action}
    </div>
  )
}
