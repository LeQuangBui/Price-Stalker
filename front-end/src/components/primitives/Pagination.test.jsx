import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Pagination from './Pagination'

describe('Pagination', () => {
  it('renders nothing for a single page', () => {
    const { container } = render(<Pagination page={0} totalPages={1} onPrev={vi.fn()} onNext={vi.fn()} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('is self-contained — carries no class a page stylesheet owns', () => {
    const { container } = render(<Pagination page={0} totalPages={3} onPrev={vi.fn()} onNext={vi.fn()} />)
    expect(container.querySelector('.pagination')).toBeNull()
    expect(container.querySelector('.pagination-info')).toBeNull()
  })

  it('gives both buttons a 44px touch target', () => {
    render(<Pagination page={1} totalPages={3} onPrev={vi.fn()} onNext={vi.fn()} />)
    for (const name of [/previous/i, /next/i]) {
      expect(screen.getByRole('button', { name }).className).toContain('min-h-11')
    }
  })

  it('disables Previous on the first page and Next on the last', () => {
    const { rerender } = render(<Pagination page={0} totalPages={3} onPrev={vi.fn()} onNext={vi.fn()} />)
    expect(screen.getByRole('button', { name: /previous/i })).toBeDisabled()
    expect(screen.getByRole('button', { name: /next/i })).toBeEnabled()

    rerender(<Pagination page={2} totalPages={3} onPrev={vi.fn()} onNext={vi.fn()} />)
    expect(screen.getByRole('button', { name: /previous/i })).toBeEnabled()
    expect(screen.getByRole('button', { name: /next/i })).toBeDisabled()
  })

  it('calls the handlers', async () => {
    const onPrev = vi.fn()
    const onNext = vi.fn()
    render(<Pagination page={1} totalPages={3} onPrev={onPrev} onNext={onNext} />)
    await userEvent.click(screen.getByRole('button', { name: /previous/i }))
    await userEvent.click(screen.getByRole('button', { name: /next/i }))
    expect(onPrev).toHaveBeenCalledOnce()
    expect(onNext).toHaveBeenCalledOnce()
  })

  it('still reports the position', () => {
    render(<Pagination page={1} totalPages={5} onPrev={vi.fn()} onNext={vi.fn()} />)
    expect(screen.getByText(/page 2 of 5/i)).toBeVisible()
  })
})
