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
