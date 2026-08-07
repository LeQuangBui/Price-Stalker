import { cx } from '../../lib/cx'
import { formatPrice } from '../../utils/formatters'

const SIZES = {
  sm: 'text-2xl',
  md: 'text-4xl',
  lg: 'text-display-sm',
  xl: 'text-display',
}

/**
 * The hero number of a price tracker: serif display face, tabular figures,
 * always rendered at its final value (never animated). Optional struck-through
 * `was` price for drops.
 */
export default function PriceDisplay({ value, currency, was, size = 'md', className }) {
  return (
    <span className={cx('inline-flex items-end gap-3', className)}>
      <span
        className={cx(
          'font-display font-semibold leading-none tracking-tight tabular-nums text-ink',
          SIZES[size] || SIZES.md
        )}
      >
        {formatPrice(value, currency)}
      </span>
      {was != null && was !== '' ? (
        <span className="pb-1 text-sm tabular-nums text-ink-mute line-through">
          {formatPrice(was, currency)}
        </span>
      ) : null}
    </span>
  )
}
