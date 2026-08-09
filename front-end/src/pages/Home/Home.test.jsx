import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import Home from './Home'

vi.mock('../../api/products', () => ({
  getProducts: vi.fn(() => Promise.resolve({
    content: [],
    totalPages: 0
  })),
  createProductExtraction: vi.fn(),
  getProductExtraction: vi.fn(),
  getProduct: vi.fn()
}))

describe('Home layout', () => {
  it('keeps the search area in a raised stacking layer above product cards', () => {
    render(
      <MemoryRouter>
        <Home isSignedIn={false} />
      </MemoryRouter>
    )

    expect(screen.getByText('Product radar').closest('section')).toHaveClass('search-layer')
  })
})

describe('Home page chrome', () => {
  it('keeps the search-layer token and its z-index as utilities', () => {
    // `.search-layer`'s z-40 is a three-way contract with Header (z-50) and TabBar (z-40);
    // both files cite it by name in comments. The token must survive the CSS retirement.
    render(
      <MemoryRouter>
        <Home isSignedIn={false} />
      </MemoryRouter>
    )

    const layer = screen.getByText('Product radar').closest('section')
    expect(layer.className).toContain('search-layer')
    expect(layer.className).toContain('relative')
    expect(layer.className).toContain('z-40')
  })
})
