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

  // Every consumer announces its loading state and then falls silent, so the outcome of the fetch
  // was the one thing a screen reader never heard. `status`, not `alert` — an empty list is an
  // outcome, not a problem.
  it('announces itself politely', () => {
    render(<EmptyState title="Nothing here" />)
    expect(screen.getByRole('status')).toHaveTextContent(/nothing here/i)
  })

  it('composes an extra className', () => {
    const { container } = render(<EmptyState title="X" className="mt-10" />)
    expect(container.firstChild.className).toContain('mt-10')
    expect(container.firstChild.className).toContain('empty-state')
  })

  it('renders the heading at the level the page asks for, defaulting to three', () => {
    // The level belongs to the page: directly under an h1 on Bookmarks and Alerts it is 2, under
    // an h2 section it stays the default 3, under the chart card's h3 title it is 4. The size is
    // keyed to the panel (`.empty-state > :is(h2, h3, h4)`), not the tag, so every level renders
    // identically.
    const { container, rerender } = render(<EmptyState title="X" />)
    expect(container.querySelector('h3')).not.toBeNull()
    rerender(<EmptyState title="X" level={2} />)
    expect(container.querySelector('h2')).not.toBeNull()
    expect(container.querySelector('h3')).toBeNull()
    rerender(<EmptyState title="X" level={4} />)
    expect(container.querySelector('h4')).not.toBeNull()
  })
})
