import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import ProductList from './ProductList'

const product = (over = {}) => ({
  id: 'p1', name: 'Espresso Machine', currency: 'USD',
  price: null, originalPrice: null, flashSalePrice: null, images: [], ...over,
})

function renderList(products) {
  return render(<MemoryRouter><ProductList products={products} /></MemoryRouter>)
}

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
  // the inner box is 77px and nothing on the type scale fits, so 320 stays single-column.
  it('stays one column at 320 and goes two-up from 360', () => {
    const { container } = renderList([product()])
    const grid = container.firstChild
    expect(classesOf(grid)).toContain('grid-cols-1')
    expect(classesOf(grid)).toContain('min-[360px]:grid-cols-2')
    // `sm:` is 640px — four phone widths too late for the second column.
    expect(classesOf(grid)).not.toContain('sm:grid-cols-2')
  })

  it('keeps the three- and four-column desktop steps', () => {
    const { container } = renderList([product()])
    const grid = container.firstChild
    expect(classesOf(grid)).toContain('lg:grid-cols-3')
    expect(classesOf(grid)).toContain('xl:grid-cols-4')
  })

  it('links each card to its product', () => {
    renderList([product()])
    expect(screen.getByRole('link', { name: /espresso machine/i })).toHaveAttribute('href', '/products/p1')
  })

  it('shows a fallback when there is no image', () => {
    renderList([product()])
    expect(screen.getByText(/no image/i)).toBeVisible()
  })
})
