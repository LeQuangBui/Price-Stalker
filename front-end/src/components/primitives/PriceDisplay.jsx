import { cx } from '../../lib/cx'
import { formatPrice } from '../../utils/formatters'

// `sm` is the card price, and it steps with the two-up product grid rather than holding one
// size. A price cannot wrap — Intl puts a non-breaking space before the ₫ — and the card clips
// silently, so the number has to fit the column outright: 16px across the 360-389 band (88px of
// text in a 97px interior), 18px from 390 (99px in 112px), and back to the full 24px at `sm:`,
// where the grid is no longer squeezing. 16px everywhere was the simpler option and was rejected:
// the product name above it is 15px semibold, so a flat 16px price flattens the hierarchy.
const SIZES = {
  sm: 'text-base min-[390px]:text-lg sm:text-2xl',
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
    // Wrapping is load-bearing on a two-up card: at 390px the value and the struck price total
    // ~195px against a ~112px interior, and a nowrap row would put the `was` price under the
    // card's `overflow-hidden`. The row gap only ever applies once they actually wrap.
    <span className={cx('inline-flex flex-wrap items-end gap-x-3 gap-y-1', className)}>
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
