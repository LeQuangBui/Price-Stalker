import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import ProductList from './ProductList'
import { CARD_PRICE_SIZE } from '../primitives/PriceDisplay'

const product = (over = {}) => ({
  id: 'p1', name: 'Espresso Machine', currency: 'USD',
  price: null, originalPrice: null, flashSalePrice: null, images: [], ...over,
})

function renderList(products) {
  return render(<MemoryRouter><ProductList products={products} /></MemoryRouter>)
}

// Each card is [image, body]; each body is [name, price block].
const cards = (container) => [...container.querySelectorAll('a')].map((card) => ({
  name: card.lastElementChild.firstElementChild,
  price: card.lastElementChild.lastElementChild,
}))

// Exact class tokens — `toContain` on the raw string would let `sm:grid-cols-2` satisfy a
// check for `grid-cols-2`, which is the one confusion these assertions exist to catch.
const classesOf = (el) => el.className.split(/\s+/)

describe('ProductList', () => {
  it('renders an EmptyState when there are no products', () => {
    renderList([])
    expect(screen.getByRole('heading', { name: /no products found/i })).toBeVisible()
  })

  it('carries no class owned by a stylesheet', () => {
    const { container } = renderList([product()])
    for (const cls of ['product-grid', 'product-card', 'product-info', 'product-name', 'product-price', 'no-image', 'no-products']) {
      expect(container.querySelector(`.${cls}`), `${cls} should be gone`).toBeNull()
    }
  })

  // Vietnamese e-commerce is two-up on phones, but the card is `overflow-hidden` and a price
  // string cannot wrap, so the second column only pays off once a legible price fits. At 320px
  // the inner box is 85px and nothing on the type scale fits, so 320 stays single-column.
  it('stays one column at 320 and goes two-up from 22.5rem', () => {
    const { container } = renderList([product()])
    const grid = container.firstChild
    expect(classesOf(grid)).toContain('grid-cols-1')
    expect(classesOf(grid)).toContain('min-[22.5rem]:grid-cols-2')
    // `sm:` is 640px — four phone widths too late for the second column.
    expect(classesOf(grid)).not.toContain('sm:grid-cols-2')
  })

  // The gutters, the card padding and the price are all rem and grow with the reader's default
  // font size. A px breakpoint would not, so the second column would arrive at the same viewport
  // width with a smaller interior and larger type inside it, and the price would clip.
  it('breaks on rem, so the column arrives with the room it was measured against', () => {
    const { container } = renderList([product()])
    const pixelSteps = classesOf(container.firstChild).filter((cls) => /^min-\[\d+px\]:/.test(cls))
    expect(pixelSteps, `px breakpoints do not scale: ${pixelSteps.join(', ')}`).toEqual([])
  })

  // If the second column arrived at one width and the price stepped down at another, the band
  // between them would show two columns at the full 24px price, which does not fit and is sliced
  // off without an ellipsis. These two numbers are one decision and have to stay one number.
  it('drops the price a size at exactly the width the second column arrives', () => {
    const { container } = renderList([product()])
    const twoUp = classesOf(container.firstChild).find((cls) => cls.endsWith(':grid-cols-2'))
    const stepDown = CARD_PRICE_SIZE.split(' ').find((cls) => cls.endsWith(':text-base'))
    expect(stepDown).toBe(`${twoUp.split(':')[0]}:text-base`)
  })

  it('keeps the three- and four-column desktop steps', () => {
    const { container } = renderList([product()])
    const grid = container.firstChild
    expect(classesOf(grid)).toContain('lg:grid-cols-3')
    expect(classesOf(grid)).toContain('xl:grid-cols-4')
  })

  // Whatever the card body does not spend on padding it hands to the price, and the two-up column
  // has the least to give: 16px a side on a 131px card at 360px leaves a 97px interior. 12px in
  // the phone band takes that to 105px, which is the difference between the Georgia fallback
  // clearing the clip edge and running past it. `sm:` gets the roomier 16px back.
  it('trims the card padding in the phone band and takes it back at sm:', () => {
    const { container } = renderList([product()])
    const classes = classesOf(container.querySelector('a').lastElementChild)
    expect(classes).toContain('px-3')
    expect(classes).toContain('py-4')
    expect(classes).toContain('pb-[18px]')
    expect(classes).toContain('sm:px-4')
    // `p-4` would set all four sides and beat the narrower phone value on the horizontal axis.
    expect(classes).not.toContain('p-4')
  })

  it('links each card to its product', () => {
    renderList([product()])
    expect(screen.getByRole('link', { name: /espresso machine/i })).toHaveAttribute('href', '/products/p1')
  })

  it('shows a fallback when there is no image', () => {
    renderList([product()])
    expect(screen.getByText(/no image/i)).toBeVisible()
  })

  // One line of `truncate` in a two-up column left about ten characters of a forty-five character
  // name — "Điện thoại i…" — which on a tracker watching one specific SKU cannot tell an iPhone 15
  // from an iPhone 15 Pro Max. Two lines roughly double that, and every storefront this grid is
  // modelled on clamps at two.
  it('gives the product name two lines rather than one truncated one', () => {
    const { container } = renderList([product()])
    const classes = classesOf(cards(container)[0].name)
    expect(classes).toContain('line-clamp-2')
    expect(classes).not.toContain('truncate')
  })

  // The name has to move with the reader for the same reason everything else on this card does.
  // A px size does not: at a 24px default font the price above the name renders at 24px and the
  // name stays at 13 — a name SMALLER than it was before the grid went two-up, and it stays that
  // way until a 960px viewport, because `sm:` is 40rem and moves out with the font too.
  it('sizes the name in rem, so it grows with the reader like everything around it', () => {
    const { container } = renderList([product()])
    const classes = classesOf(cards(container)[0].name)
    expect(classes).toContain('text-sm')
    expect(classes).toContain('sm:text-[0.9375rem]')
    const pixelSizes = classes.filter((cls) => /^(?:\w+:)?text-\[\d+px\]$/.test(cls))
    expect(pixelSizes, `px type does not scale: ${pixelSizes.join(', ')}`).toEqual([])
  })

  // `line-clamp-2` clamps at two lines but a one-word name still occupies one, which would leave
  // the price sitting higher on some cards than on the card beside it. Both lines are reserved
  // in em, so the box holds its shape at either type size without a second magic number — and
  // only from 22.5rem, where the second column arrives and a card first has a neighbour to line
  // up with. In one column the reservation is a blank line under every short name.
  it('reserves both name lines where cards share a row, and only there', () => {
    const { container } = renderList([product(), product({ id: 'p2', name: 'A very much longer product name that will certainly need both of its lines' })])
    const [short, long] = cards(container).map(({ name }) => classesOf(name))
    expect(short).toContain('min-[22.5rem]:min-h-[2.75em]')
    expect(short).not.toContain('min-h-[2.75em]')
    expect(short).toEqual(long)
  })

  // A card with no old price used to carry a band of blank surface where its neighbour's struck
  // row sits. Reserving the row gives every card in the grid the same price block.
  it('reserves the struck price row on every card, drop or no drop', () => {
    const { container } = renderList([
      product({ price: 12900000, originalPrice: 15900000 }),
      product({ id: 'p2', name: 'Grinder', price: 2490000 }),
    ])
    expect(cards(container).map(({ price }) => price.children.length)).toEqual([2, 2])
  })
})
