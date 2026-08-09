import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'
import PriceDisplay, { CARD_PRICE_SIZE } from './PriceDisplay'

// The wrapper's first child is always the tracked value; the struck `was` price, when present,
// is the second.
function parts(container) {
  const wrapper = container.firstChild
  return { wrapper, value: wrapper.children[0], was: wrapper.children[1] }
}

const NBSP = '\u00a0'

// Exact class tokens. A substring check would let `min-[24.375rem]:text-lg` satisfy a test for
// `text-lg`, which would hide a missing base step.
const classesOf = (el) => el.className.split(/\s+/)

// Resolve the size ladder the way the cascade does — every step is a min-width query, they are
// emitted in ascending order, so the last one that matches wins. Testing the ladder's meaning at
// a width beats testing its spelling: the widths are the decision, the class names are notation.
function sizeAtRem(rem) {
  let winner = null
  for (const step of CARD_PRICE_SIZE.split(' ')) {
    const [prefix, cls] = step.includes(':') ? step.split(':') : [null, step]
    const from = prefix === null ? 0
      : prefix === 'sm' ? 40
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
  // `sm:` is (viewport − 7rem) in one column: gutters, page padding and card padding are all rem.
  it('applies the ladder to the card price', () => {
    const { container } = render(<PriceDisplay value={12900000} size="sm" />)
    const classes = classesOf(parts(container).value)
    for (const step of CARD_PRICE_SIZE.split(' ')) expect(classes).toContain(step)
  })

  // At 320px on a default font the grid is deliberately still one column and 24px of price fits
  // its 206px interior with room to spare. Dropping to 16px there left the struck `was` price,
  // which is 14px, reading as loud as the price the shopper would actually pay.
  it('is full size at 320px, where the grid is still one column', () => {
    expect(sizeAtRem(320 / 16)).toBe('text-2xl')
  })

  // Same 320px phone, but the reader has set the browser default to 24px: the card interior is
  // 150px, not 206px, and 24px of type has become 36px. Full size slices about 62px off a 9-digit
  // price. The ladder reads the viewport in rem, so this case falls out of the same rule.
  it('is not full size on a 320px phone with a 24px default font, where it would not fit', () => {
    expect(sizeAtRem(320 / 24)).toBe('text-base')
  })

  it('steps down for the two-up squeeze and recovers once the column is wide again', () => {
    expect(sizeAtRem(22.5)).toBe('text-base')
    expect(sizeAtRem(24.375)).toBe('text-lg')
    expect(sizeAtRem(40)).toBe('text-2xl')
  })

  // The gutters, the card padding and the price itself are all rem, so they grow when a reader
  // raises the browser's default font size. A px breakpoint does not: the column would arrive at
  // the same viewport width with less room inside it and more type to fit, and the price clips.
  // sizeAtRem throws on anything that is not a rem step, so this covers the whole ladder.
  it('breaks on rem, so every step tracks the reader\'s own font size', () => {
    expect(() => sizeAtRem(20)).not.toThrow()
    expect(CARD_PRICE_SIZE).not.toMatch(/min-\[\d+px\]/)
  })

  it('leaves the other sizes on a single step', () => {
    for (const [size, expected] of [['md', 'text-4xl'], ['lg', 'text-display-sm'], ['xl', 'text-display']]) {
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

    it('gives both cases the identical two-row shape', () => {
      const drop = render(<PriceDisplay value={12900000} was={15900000} size="sm" reserveWas />)
      const flat = render(<PriceDisplay value={12900000} size="sm" reserveWas />)
      const shape = ({ container }) => classesOf(parts(container).was).filter((cls) => cls !== 'invisible')
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
