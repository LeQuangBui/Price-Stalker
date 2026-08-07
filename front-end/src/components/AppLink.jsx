import { Link } from 'react-router-dom'

/**
 * Link that opts into React Router's View Transitions by default (data router).
 * The browser cross-fades old→new DOM; `prefers-reduced-motion` is honored via
 * the `::view-transition-*` guard in index.css. Pass `viewTransition={false}` to
 * opt a specific link out.
 */
export default function AppLink({ viewTransition = true, ...props }) {
  return <Link viewTransition={viewTransition} {...props} />
}
