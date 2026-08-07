import { cx } from '../../lib/cx'

// Editorial eyebrow: mono, oxblood, wide tracking, with a leading rule.
export default function Kicker({ children, className }) {
  return (
    <p className={cx('font-meta text-xs font-semibold uppercase tracking-[0.22em] text-oxblood', className)}>
      <span className="text-ink-mute">——&nbsp;</span>
      {children}
    </p>
  )
}
