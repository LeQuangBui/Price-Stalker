import { cx } from '../../lib/cx'
import { formatPrice } from '../../utils/formatters'

// The card price steps with the two-up product grid rather than holding one size. A price cannot
// wrap — Intl puts a no-break space before the ₫ — and the card clips silently, so the number has
// to fit the column outright: the full 24px while the grid is still one column and the card is
// wide, 16px for the whole two-up squeeze, and 24px again at `sm:`, where the grid is no longer
// squeezing. The ladder is what keeps the number on one line; `wrap-anywhere` on the value span
// below is the backstop for when it cannot, and the two are meant to be read together.
//
// An 18px step at 24.375rem was tried and taken out again. It raised the type faster than the
// column grew, so wrapping stopped being monotonic in viewport width: a round 9-digit price held
// one line at 375px and 384px and broke at 390px and 393px — iPhone 12 through 15, and Pixel —
// because those widths had just stepped up to 18px while the column had barely moved. The first
// measurements missed it by using mixed-digit fixtures. `0` is 47% wider than `1` in this face
// and Vietnamese shelf prices are round numbers, so `100.000.000 ₫` is the string to design
// against, not `122.222.229 ₫`.
//
// Every step is rem, and the whole ladder is really a statement about how much room is inside the
// card, which is a rem quantity: below `sm:` the page gutters resolve to 1rem a side, the page
// padding to 1.5rem and the card padding to 0.75rem, so the interior is (viewport − 6.5rem − 2px)
// in one column whatever the reader's font size is. px breakpoints broke that. The gutters, the
// padding and the type all grow when a reader raises the browser's default font size but a px
// breakpoint does not move, so the column arrived at the same viewport width with less room in it
// and more type to fit: measured against the compiled stylesheet, the px ladder clipped from 360
// to 438px at a 20px default font and from 360 to 520px at 24px.
//
// `min-[22.5rem]` MUST stay identical to the grid's own two-up breakpoint in ProductList — see
// PRODUCT_GRID, which carries the same warning. If the column arrived at one width and the price
// stepped down at another, the band between them would show two columns at 24px, which does not
// fit. It is one decision written in two files, so it has to stay one number; a test asserts it.
//
// The 17rem step is the low end of the same rule. 24px of 9-digit price measures about 9.4rem
// against a one-column interior of (viewport − 6.5rem), so the full size stops fitting somewhere
// below 16rem of viewport — measured as the width where clipping starts. 17rem clears that with
// headroom. At a default font it is 272px, below any phone, so the one-column 320px case
// keeps its 24px price; at a 24px default font it is 408px, and it is what keeps a 320px phone on
// "Very Large" from slicing digits off a 36px price in a 150px card.
//
// Prices of ten digits or more are outside what this ladder can hold, full stop — not only in the
// two-up band. Measured with the webfont loaded and a classic scrollbar, they ran past the clip
// edge in the ONE-column layout too: at a 20px default font from 340 to 348px, at 24px from 320
// to 331 and again from 408 to 413. Both bands widen on the Georgia fallback. What that looked
// like depended on the reader's scrollbar: with overlay scrollbars the ₫ went missing and the
// number read as a bare figure; with a classic 15px gutter `1.290.000.000 ₫` came back as
// `1.290.000.00`, which is not a truncated number but a plausible one that is a thousand times
// wrong. That is why the backstop exists, and it is history rather than behaviour now — the value
// span carries `wrap-anywhere`, so such a price breaks across two lines with every digit intact.
// The ladder still makes no promise to fit one on a single line.
export const CARD_PRICE_SIZE =
  'text-base min-[17rem]:text-2xl min-[22.5rem]:text-base sm:text-2xl'

const SIZES = {
  sm: CARD_PRICE_SIZE,
  md: 'text-4xl',
  lg: 'text-display-sm',
  xl: 'text-display',
}

/**
 * The hero number of a price tracker: serif display face, tabular figures,
 * always rendered at its final value (never animated). Optional struck-through
 * `was` price for drops.
 *
 * `reserveWas` fixes the block's shape for callers that lay prices out in a row of cards: the
 * struck slot always takes a line of its own, and it is always there even when there is no drop
 * to show. Without it a card with no old price is a row shorter than the sale card beside it, and
 * the pair flips between one row and two as the window widens. Off by default — the detail page
 * shows one price on its own and wants it inline.
 */
export default function PriceDisplay({ value, currency, was, size = 'md', reserveWas = false, className }) {
  const hasWas = was != null && was !== ''

  return (
    // Wrapping is load-bearing on a two-up card: in the narrow band the value and the struck price
    // together are far wider than the interior, and a nowrap row would put the `was` price under
    // the card's `overflow-hidden`. The row gap only ever applies once they actually wrap.
    <span className={cx('inline-flex flex-wrap items-end gap-x-3 gap-y-1', className)}>
      <span
        className={cx(
          // `wrap-anywhere` has to be this exact value, and it is the one thing standing between a
          // reader and a wrong number. A formatted price holds no break opportunity, so its
          // min-content width equals its full width; a flex item is floored at min-content, so it
          // can never shrink, so it overflows and the card's `overflow-hidden` takes the end off
          // the number with no ellipsis and no scrollbar to show that anything went.
          //
          // Per CSS Text, `overflow-wrap: anywhere` is the only value whose break opportunities
          // count towards intrinsic sizing. `overflow-wrap: break-word` and `word-break:
          // break-word` are both defined NOT to, so neither moves the min-content floor and
          // neither changes anything here. Two other candidates were measured and rejected:
          // `min-w-0` with `text-overflow` does nothing, because the inline-flex wrapper sizes to
          // max-content and the item is never asked to shrink; `max-w-full` on the wrapper does
          // ellipsise, but it also ellipsises `12.900.000 ₫` at 360px, a price that fits today
          // with room to spare.
          //
          // It engages at the content box, not at the clip edge: CSS wraps text where its own box
          // ends, while `overflow: hidden` clips 12px further out at the padding box. Measured
          // over 45,720 cells it never once fired on a price that fits its box, and no price of
          // seven digits or fewer wraps at any width in any combination of face, scrollbar and
          // default font size. What it does cost is the prices that used to reach one line only by
          // bleeding into the card's right padding — those wrap now. A price over two lines is
          // ugly; a price missing a digit is wrong, and wrong loses.
          'font-display font-semibold leading-none tracking-tight tabular-nums text-ink wrap-anywhere',
          SIZES[size] || SIZES.md
        )}
      >
        {formatPrice(value, currency)}
      </span>
      {hasWas || reserveWas ? (
        <span
          className={cx(
            // The same backstop, and it is not decoration. A flex container's own min-content
            // width is the widest min-content among its items, so an unbreakable struck price
            // floors the whole block ABOVE the card's content box — and the value span, however
            // freely it wraps, is then laid out to that floor and spills anyway. Measured on the
            // one card whose old price is also ten digits: the block came out 114.41px wide in a
            // 98px box and put the value 4.91px past the clip edge, wrapped and all. Both spans
            // have to be able to break or neither of them can.
            'pb-1 text-sm tabular-nums text-ink-mute line-through wrap-anywhere',
            // `basis-full` takes the whole flex line, so the struck price sits under the value at
            // every width instead of only at the widths where it happens not to fit beside it.
            reserveWas && 'basis-full',
            // Reserved but empty. `invisible` keeps the box and its height while taking the text
            // out of the a11y tree; an empty span would collapse and reserve nothing, so the
            // placeholder needs a character in it.
            //
            // Gated on the grid's own two-up breakpoint, because a reserved row only earns its
            // keep once a card has a neighbour to line its price up with. Below 22.5rem the grid
            // is one column and the reservation is a blank band under every price that never
            // matches anything. 22.5rem is PRODUCT_GRID's number — see the warning above.
            !hasWas && 'invisible hidden min-[22.5rem]:block'
          )}
        >
          {hasWas ? formatPrice(was, currency) : '\u00a0'}
        </span>
      ) : null}
    </span>
  )
}
