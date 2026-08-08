import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import TabBar from './TabBar'

function renderAt(path, props = {}) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <TabBar isSignedIn {...props} />
    </MemoryRouter>,
  )
}

describe('TabBar', () => {
  it('renders nothing when signed out', () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/']}>
        <TabBar isSignedIn={false} />
      </MemoryRouter>,
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('renders the four primary destinations', () => {
    renderAt('/')
    expect(screen.getByRole('link', { name: /home/i })).toHaveAttribute('href', '/')
    expect(screen.getByRole('link', { name: /alerts/i })).toHaveAttribute('href', '/alerts')
    expect(screen.getByRole('link', { name: /saved/i })).toHaveAttribute('href', '/bookmarks')
    expect(screen.getByRole('link', { name: /account/i })).toHaveAttribute('href', '/profile')
  })

  it('marks the active destination for assistive tech', () => {
    renderAt('/alerts')
    expect(screen.getByRole('link', { name: /alerts/i })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: /home/i })).not.toHaveAttribute('aria-current')
  })

  it('marks Account active on /profile so phone users can always reach sign out', () => {
    renderAt('/profile')
    expect(screen.getByRole('link', { name: /account/i })).toHaveAttribute('href', '/profile')
    expect(screen.getByRole('link', { name: /account/i })).toHaveAttribute('aria-current', 'page')
  })

  it('does not mark Home active on a sub-route', () => {
    renderAt('/bookmarks')
    expect(screen.getByRole('link', { name: /home/i })).not.toHaveAttribute('aria-current')
  })

  it('is a labelled navigation landmark hidden from desktop', () => {
    renderAt('/')
    const nav = screen.getByRole('navigation', { name: /primary/i })
    expect(nav.className).toContain('md:hidden')
  })
})
