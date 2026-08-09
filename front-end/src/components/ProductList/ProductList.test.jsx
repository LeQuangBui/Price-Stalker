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

  it('stacks to one column on phones and widens from sm up', () => {
    const { container } = renderList([product()])
    const grid = container.firstChild
    expect(grid.className).toContain('grid-cols-1')
    expect(grid.className).toContain('sm:grid-cols-2')
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
