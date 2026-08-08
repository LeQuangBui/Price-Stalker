import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Header from './Header'
import { getNotifications } from '../../api/notifications'

// Header renders NotificationBell when signed in, which reads/writes localStorage
// (last-seen timestamp) and calls getNotifications() on mount. Under this toolchain's
// jsdom + Node combination, globalThis.localStorage is not populated for us, so an
// unstubbed render throws before any assertion runs — see src/api/client.test.js,
// src/api/auth.test.js and src/layouts/RootLayout.test.jsx for the same pattern.
vi.mock('../../api/notifications', () => ({
  getNotifications: vi.fn(),
}))

function createLocalStorageMock() {
  const store = new Map()
  return {
    getItem: vi.fn((key) => store.get(key) ?? null),
    setItem: vi.fn((key, value) => store.set(key, String(value))),
    removeItem: vi.fn((key) => store.delete(key)),
    clear: vi.fn(() => store.clear()),
  }
}

beforeEach(() => {
  vi.stubGlobal('localStorage', createLocalStorageMock())
  getNotifications.mockResolvedValue([])
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

function renderHeader(props = {}) {
  return render(
    <MemoryRouter>
      <Header isSignedIn theme="light" onToggleTheme={vi.fn()} {...props} />
    </MemoryRouter>,
  )
}

describe('Header', () => {
  it('hides the destination nav below md, where the tab bar owns navigation', () => {
    renderHeader()
    const nav = screen.getByRole('navigation')
    expect(nav.className).toContain('hidden')
    expect(nav.className).toContain('md:flex')
  })

  it('keeps the theme toggle visible at every width', () => {
    renderHeader()
    const toggle = screen.getByRole('button', { name: /switch to dark mode/i })
    expect(toggle.className).not.toContain('hidden')
  })

  it('gives the theme toggle a 44px touch target', () => {
    renderHeader()
    const toggle = screen.getByRole('button', { name: /switch to dark mode/i })
    expect(toggle.className).toContain('h-11')
    expect(toggle.className).toContain('w-11')
  })

  it('no longer renders Sign Out — it moved to the profile page', () => {
    renderHeader()
    expect(screen.queryByRole('button', { name: /sign out/i })).toBeNull()
  })

  it('shows auth links when signed out', () => {
    renderHeader({ isSignedIn: false })
    expect(screen.getByRole('link', { name: /login/i })).toHaveAttribute('href', '/login')
  })
})
