import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'
import PriceDisplay, { CARD_PRICE_SIZE, HERO_PRICE_SIZE } from './PriceDisplay'

// The wrapper's first child is always the tracked value; the struck `was` price, when present,
// is the second.
function parts(container) {
  const wrapper = container.firstChild
  return { wrapper, value: wrapper.children[0], was: wrapper.children[1] }
}

const NBSP = '\u00a0'

// Exact class tokens. A substring check would let `min-[17rem]:text-2xl` satisfy a test for
// `text-2xl`, which would hide a missing base step.
const classesOf = (el) => el.className.split(/\s+/)

// Tailwind's own breakpoints, in rem. `@theme inline` overrides none of them, checked against
// index.css:83-121, so these are the framework values and not a local convention.
const NAMED = { sm: 40, md: 48, lg: 64, xl: 80 }

// Resolve a size ladder the way the cascade does — every step is a min-width query, they are
// emitted in ascending order, so the last one that matches wins. Testing the ladder's meaning at
// a width beats testing its spelling: the widths are the decision, the class names are notation.
function sizeAtRem(rem, ladder = CARD_PRICE_SIZE) {
  let winner = null
  for (const step of ladder.split(' ')) {
    const [prefix, cls] = step.includes(':') ? step.split(':') : [null, step]
    const from = prefix === null ? 0
      : prefix in NAMED ? NAMED[prefix]
      : Number(/^min-\[([\d.]+)rem\]$/.exec(prefix)?.[1])
    if (!Number.isFinite(from)) throw new Error(`unreadable step "${step}" — rem breakpoints only`)
    if (rem >= from) winner = cls
  }
  return winner
}

describe('PriceDisplay', () => {
  it('renders the tracked value', () => {
    const { container } = render(<PriceDisplay value={12900000} />)
    expect(parts(container).value.textContent).toMatch(/12/)
  })

  it('renders the was price struck through when there is one', () => {
    const { container } = render(<PriceDisplay value={12900000} was={15900000} />)
    expect(classesOf(parts(container).was)).toContain('line-through')
  })

  it('omits the was price when there is none', () => {
    const { container } = render(<PriceDisplay value={12900000} />)
    expect(parts(container).wrapper.children).toHaveLength(1)
  })

  // Intl.NumberFormat puts a non-breaking space before the ₫ glyph, so a price string cannot
  // break; inside an `overflow-hidden` card, a price wider than the column is silently sliced
  // rather than ellipsised. The size therefore has to follow the room in the card, which below
  // `sm:` is (viewport − 6.5rem) in one column: gutters, page padding and card padding are all rem.
  it('applies the ladder to the card price', () => {
    const { container } = render(<PriceDisplay value={12900000} size="sm" />)
    const classes = classesOf(parts(container).value)
    for (const step of CARD_PRICE_SIZE.split(' ')) expect(classes).toContain(step)
  })

  // At 320px on a default font the grid is deliberately still one column and 24px of price fits
  // its 214px interior with room to spare. Dropping to 16px there left the struck `was` price,
  // which is 14px, reading as loud as the price the shopper would actually pay.
  it('is full size at 320px, where the grid is still one column', () => {
    expect(sizeAtRem(320 / 16)).toBe('text-2xl')
  })

  // Same 320px phone, but the reader has set the browser default to 24px: the card interior is
  // 150px, not 214px, and 24px of type has become 36px. Full size slices about 62px off a 9-digit
  // price. The ladder reads the viewport in rem, so this case falls out of the same rule.
  it('is not full size on a 320px phone with a 24px default font, where it would not fit', () => {
    expect(sizeAtRem(320 / 24)).toBe('text-base')
  })

  it('steps down for the two-up squeeze and recovers once the column is wide again', () => {
    expect(sizeAtRem(22.5)).toBe('text-base')
    expect(sizeAtRem(40)).toBe('text-2xl')
  })

  // An 18px step used to sit at 24.375rem, and it came back out. It raised the type faster than
  // the column grew, so wrapping stopped being monotonic in viewport width: a round 9-digit price
  // held one line at 375px and 384px and broke at 390px and 393px — iPhone 12 through 15, and
  // Pixel — which had just stepped up while the column had barely moved. One size across the band
  // means a wider phone can never do worse than a narrower one that already worked.
  it('holds one size across the whole two-up band', () => {
    for (const rem of [22.5, 23, 24.375, 26, 30, 35, 39.9]) {
      expect(sizeAtRem(rem), `${rem}rem`).toBe('text-base')
    }
  })

  // The gutters, the card padding and the price itself are all rem, so they grow when a reader
  // raises the browser's default font size. A px breakpoint does not: the column would arrive at
  // the same viewport width with less room inside it and more type to fit, and the price clips.
  // sizeAtRem throws on anything that is not a rem step, so this covers the whole ladder.
  it('breaks on rem, so every step tracks the reader\'s own font size', () => {
    expect(() => sizeAtRem(20)).not.toThrow()
    expect(CARD_PRICE_SIZE).not.toMatch(/min-\[\d+px\]/)
  })

  // The ladder is the design; this is the backstop under it. A formatted price holds no break
  // opportunity — Intl puts a no-break space before the ₫ — so its min-content width equals its
  // full width, and a flex item floored at min-content cannot shrink: it overflows and the
  // `overflow-hidden` card takes the end off the number with no ellipsis and no scrollbar.
  // `1.290.000.000 ₫` came back as `1.290.000.00`, which is not a truncated number, it is a
  // plausible one that is a thousand times wrong.
  //
  // `overflow-wrap: anywhere` is the only one of the three candidates that fixes it. Per CSS Text
  // it is the only value whose break opportunities count towards intrinsic sizing;
  // `overflow-wrap: break-word` and `word-break: break-word` are defined not to, so they leave the
  // min-content floor exactly where it was and the item still cannot shrink. A price split over
  // two lines is ugly. A price missing a digit is wrong, and wrong loses.
  it('breaks the number rather than losing a digit when it cannot fit', () => {
    const { container } = render(<PriceDisplay value={1290000000} currency="VND" size="sm" />)
    const classes = classesOf(parts(container).value)
    expect(classes).toContain('wrap-anywhere')
    expect(classes).not.toContain('break-words')
    expect(classes).not.toContain('break-all')
  })

  // Both prices in the block, not just the headline one, and this is measured rather than tidy.
  // A flex container's min-content width is the widest min-content among its items, so a struck
  // price that cannot break floors the whole block wider than the card's content box — and the
  // value span is then laid out to that floor and runs past the clip edge however freely it
  // wraps. On the card whose old price is also ten digits the block came out 114.41px wide in a
  // 98px box, putting the value 4.91px past the edge with a digit gone. Giving the struck price
  // the same break opportunity brought both back inside with 19.69px and 16.52px to spare.
  it('gives the struck price the same backstop, or the value cannot use its own', () => {
    const { container } = render(<PriceDisplay value={1290000000} was={1990000000} currency="VND" size="sm" reserveWas />)
    expect(classesOf(parts(container).was)).toContain('wrap-anywhere')
  })

  it('leaves the other sizes on a single step', () => {
    for (const [size, expected] of [['md', 'text-4xl'], ['lg', 'text-display-sm']]) {
      const { container, unmount } = render(<PriceDisplay value={12900000} size={size} />)
      expect(classesOf(parts(container).value), `size="${size}"`).toContain(expected)
      unmount()
    }
  })

  // At 390px the pair is ~195px of text against a ~112px card interior. Without wrapping the
  // struck price is clipped, so the wrapper has to be able to drop it onto a second row.
  it('lets the value and the was price wrap onto two rows', () => {
    const { container } = render(<PriceDisplay value={12900000} was={15900000} size="sm" />)
    const classes = classesOf(parts(container).wrapper)
    expect(classes).toContain('flex-wrap')
    expect(classes).toContain('gap-x-3')
    // A symmetric `gap-3` would leave the two rows touching once they wrap.
    expect(classes).toContain('gap-y-1')
    expect(classes).not.toContain('gap-3')
  })

  // Without a reserved slot, a card with no old price is one row shorter than the sale card
  // beside it — a band of blank surface on one and not the other — and the pair flips between
  // one row and two as the window widens, reflowing on desktop resize for no visible reason.
  describe('reserveWas', () => {
    it('holds the struck row open when there is no old price', () => {
      const { container } = render(<PriceDisplay value={12900000} size="sm" reserveWas />)
      const { wrapper, was } = parts(container)
      expect(wrapper.children).toHaveLength(2)
      expect(classesOf(was)).toContain('invisible')
      // A truly empty span would collapse to nothing and reserve no height at all.
      expect(was.textContent).toBe(NBSP)
    })

    it('puts a real old price on a row of its own rather than beside the price', () => {
      const { container } = render(<PriceDisplay value={12900000} was={15900000} size="sm" reserveWas />)
      const { was } = parts(container)
      expect(classesOf(was)).toContain('basis-full')
      expect(classesOf(was)).toContain('line-through')
      expect(classesOf(was)).not.toContain('invisible')
    })

    // The reserved row earns its keep by lining prices up ACROSS a row of cards. Below 22.5rem
    // the grid is one column, every card is alone on its row, and the row is a blank band under
    // every price for nothing. It arrives with the second column, at the second column's own
    // breakpoint.
    it('reserves nothing below the width the second column arrives at', () => {
      const { container } = render(<PriceDisplay value={12900000} size="sm" reserveWas />)
      const classes = classesOf(parts(container).was)
      expect(classes).toContain('hidden')
      expect(classes).toContain('min-[22.5rem]:block')
    })

    it('never hides a real old price, at any width', () => {
      const { container } = render(<PriceDisplay value={12900000} was={15900000} size="sm" reserveWas />)
      expect(classesOf(parts(container).was)).not.toContain('hidden')
    })

    // Three classes belong to the placeholder alone: the one that makes it invisible and the two
    // that keep it out of the one-column layout. Everything else has to match, or the reserved
    // card and the sale card beside it would not come out the same height in the band where the
    // reservation is doing its work.
    it('gives both cases the identical two-row shape', () => {
      const drop = render(<PriceDisplay value={12900000} was={15900000} size="sm" reserveWas />)
      const flat = render(<PriceDisplay value={12900000} size="sm" reserveWas />)
      const placeholderOnly = new Set(['invisible', 'hidden', 'min-[22.5rem]:block'])
      const shape = ({ container }) => classesOf(parts(container).was).filter((cls) => !placeholderOnly.has(cls))
      expect(shape(flat)).toEqual(shape(drop))
    })

    // The detail page never asks for it, so its `xl` price keeps the inline row it has today.
    it('is opt-in — an unset caller gets no reserved row', () => {
      const { container } = render(<PriceDisplay value={12900000} size="xl" />)
      expect(parts(container).wrapper.children).toHaveLength(1)
    })
  })

  it('keeps a caller className', () => {
    const { container } = render(<PriceDisplay value={12900000} className="mt-2" />)
    expect(classesOf(parts(container).wrapper)).toContain('mt-2')
  })
})

// The detail page's hero price. `text-display` alone is clamp(2.25rem, 6vw, 4.5rem), which is a
// viewport-driven size in a column that stops tracking the viewport at `lg:` — so it wrapped at
// BOTH ends: two lines of 36px in a 240px column at 320px, and the ₫ alone on line two from about
// 1180px up, where the column has frozen at 468px and 6vw has not.
describe('PriceDisplay hero ladder', () => {
  it('applies the ladder to the hero price', () => {
    const { container } = render(<PriceDisplay value={12900000} size="xl" />)
    const classes = classesOf(parts(container).value)
    for (const step of HERO_PRICE_SIZE.split(' ')) expect(classes).toContain(step)
  })

  // 246.03px of 9-digit price in a 240px column, measured at recon. The clamp cannot go below
  // 2.25rem, so the only way down is a step.
  it('steps below the clamp floor on the narrowest phones', () => {
    expect(sizeAtRem(320 / 16, HERO_PRICE_SIZE)).toBe('text-3xl')
  })

  it('is back on the clamp across the whole middle of the range', () => {
    for (const rem of [21.5, 24, 30, 40, 63.9]) {
      expect(sizeAtRem(rem, HERO_PRICE_SIZE), `${rem}rem`).toBe('text-display')
    }
  })

  // The column freezes in rem at `lg:`, where the page goes two-column, so the type has to stop
  // reading the viewport at the same width. 3.75rem of 9-digit price is ~410px in a 468px column.
  it('freezes at the breakpoint where the column does', () => {
    expect(sizeAtRem(64, HERO_PRICE_SIZE)).toBe('text-6xl')
    expect(sizeAtRem(80, HERO_PRICE_SIZE)).toBe('text-6xl')
    expect(sizeAtRem(120, HERO_PRICE_SIZE)).toBe('text-6xl')
  })

  // Monotonic: a wider viewport never gets a size that needs more room than it has gained. The
  // three steps are 1.875 / 2.25-to-4.5 / 3.75 rem, so the only place this could break is the
  // clamp's own ceiling, which is why the top step is flat and below it.
  it('never grows faster than the column it sits in', () => {
    const need = { 'text-3xl': 12.81, 'text-6xl': 25.63 } // 6.834 x the rem size
    expect(need['text-3xl']).toBeLessThan(21.5 - 5)
    expect(need['text-6xl']).toBeLessThan(29.25) // the 468px column, in rem
  })

  it('breaks on rem, so every step tracks the reader\'s own font size', () => {
    expect(() => sizeAtRem(20, HERO_PRICE_SIZE)).not.toThrow()
    expect(HERO_PRICE_SIZE).not.toMatch(/min-\[\d+px\]/)
  })
})
