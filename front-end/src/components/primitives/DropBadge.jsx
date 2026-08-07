import { cx } from '../../lib/cx'

// Percent-change pill: forest for a drop, oxblood for a rise, muted for flat.
// Colors set via inline style (token color-mix) to avoid arbitrary Tailwind
// color values that the Phase-4 lint gate will ban.
const STYLE_BY_DIR = {
  down: { color: 'var(--accent)', background: 'color-mix(in srgb, var(--accent) 15%, transparent)' },
  up: { color: 'var(--primary)', background: 'color-mix(in srgb, var(--primary) 15%, transparent)' },
  flat: { color: 'var(--text-muted)', background: 'var(--bg-tertiary)' },
}

export default function DropBadge({ oldPrice, newPrice, className }) {
  const oldVal = Number(oldPrice)
  const newVal = Number(newPrice)
  if (!Number.isFinite(oldVal) || !Number.isFinite(newVal) || oldVal <= 0) {
    return null
  }
  const pct = ((newVal - oldVal) / oldVal) * 100
  const dir = pct < -0.05 ? 'down' : pct > 0.05 ? 'up' : 'flat'
  const arrow = dir === 'down' ? '▼' : dir === 'up' ? '▲' : '—'
  return (
    <span
      style={STYLE_BY_DIR[dir]}
      className={cx(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold tabular-nums',
        className
      )}
    >
      {arrow} {Math.abs(pct).toFixed(1)}%
    </span>
  )
}
