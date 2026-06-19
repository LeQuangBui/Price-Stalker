import { act, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import AddByUrl from './AddByUrl'
import {
  createProductExtraction,
  getProduct,
  getProductExtraction
} from '../../api/products'

vi.mock('../../api/products', () => ({
  createProductExtraction: vi.fn(),
  getProductExtraction: vi.fn(),
  getProduct: vi.fn()
}))

function renderAddByUrl(props = {}) {
  return render(
    <MemoryRouter>
      <AddByUrl {...props} />
    </MemoryRouter>
  )
}

describe('AddByUrl extraction polling', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('polls the extraction request and calls onAdded when the product is ready', async () => {
    const onAdded = vi.fn()
    createProductExtraction.mockResolvedValue({
      requestId: '11111111-1111-1111-1111-111111111111',
      status: 'QUEUED'
    })
    getProductExtraction.mockResolvedValueOnce({
      requestId: '11111111-1111-1111-1111-111111111111',
      status: 'COMPLETED',
      productId: 'product-1'
    })
    getProduct.mockResolvedValue({
      id: 'product-1',
      name: 'Mouse'
    })

    renderAddByUrl({ onAdded })

    fireEvent.change(screen.getByPlaceholderText('Paste a product URL...'), {
      target: { value: 'https://gearvn.com/products/mouse' }
    })
    fireEvent.click(screen.getByRole('button', { name: /add/i }))

    await act(async () => {})
    expect(screen.getByText(/queued/i)).toBeInTheDocument()

    await act(async () => {
      vi.advanceTimersByTime(2500)
    })

    await act(async () => {})
    expect(onAdded).toHaveBeenCalledWith({ id: 'product-1', name: 'Mouse' })
    expect(getProductExtraction).toHaveBeenCalledWith('11111111-1111-1111-1111-111111111111')
    expect(getProduct).toHaveBeenCalledWith('product-1')
  })
})
