import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import EmptyState from './EmptyState'

describe('EmptyState', () => {
  it('renders the title as a heading', () => {
    render(<EmptyState title="No products found." />)
    expect(screen.getByRole('heading', { name: /no products found/i })).toBeVisible()
  })

  it('renders supporting copy when given', () => {
    render(<EmptyState title="Nothing here">Try a different search.</EmptyState>)
    expect(screen.getByText(/try a different search/i)).toBeVisible()
  })

  it('renders no paragraph when there is no supporting copy', () => {
    const { container } = render(<EmptyState title="Nothing here" />)
    expect(container.querySelector('p')).toBeNull()
  })

  it('renders an action when given', () => {
    render(<EmptyState title="Nothing here" action={<button type="button">Add one</button>} />)
    expect(screen.getByRole('button', { name: /add one/i })).toBeVisible()
  })

  it('composes an extra className', () => {
    const { container } = render(<EmptyState title="X" className="mt-10" />)
    expect(container.firstChild.className).toContain('mt-10')
    expect(container.firstChild.className).toContain('empty-state')
  })
})
