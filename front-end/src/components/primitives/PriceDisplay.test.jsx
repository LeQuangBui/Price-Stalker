import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'
import PriceDisplay from './PriceDisplay'

// The wrapper's first child is always the tracked value; the struck `was` price, when present,
// is the second.
function parts(container) {
  const wrapper = container.firstChild
  return { wrapper, value: wrapper.children[0], was: wrapper.children[1] }
}

// Exact class tokens. A substring check would let `min-[390px]:text-lg` satisfy a test for
// `text-lg`, which would hide a missing base step.
const classesOf = (el) => el.className.split(/\s+/)

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
  // rather than ellipsised. In a two-up grid the type size therefore has to follow the column:
  // 16px across 360-389, 18px from 390, and the full 24px once the grid is past sm.
  it('steps the card price size with the grid', () => {
    const { container } = render(<PriceDisplay value={12900000} size="sm" />)
    const classes = classesOf(parts(container).value)
    expect(classes).toContain('text-base')
    expect(classes).toContain('min-[390px]:text-lg')
    expect(classes).toContain('sm:text-2xl')
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

  it('keeps a caller className', () => {
    const { container } = render(<PriceDisplay value={12900000} className="mt-2" />)
    expect(classesOf(parts(container).wrapper)).toContain('mt-2')
  })
})
