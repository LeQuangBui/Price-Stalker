import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route, useOutletContext } from 'react-router-dom'
import RootLayout from './RootLayout'
import { logout } from '../api/auth'
import { getNotifications } from '../api/notifications'

// Partial mock: keep the real hasToken() (it reads localStorage, which the stub below drives,
// so a test picks its auth state by seeding the token) and replace only logout(), which is the
// side effect RootLayout's onSignOut is supposed to perform. Same module-mock pattern as
// src/pages/User/UserProfile.signout.test.jsx.
vi.mock('../api/auth', async (importOriginal) => ({
  ...(await importOriginal()),
  logout: vi.fn(),
}))

// Signed-in renders Header -> NotificationBell, which fetches on mount.
vi.mock('../api/notifications', () => ({
  getNotifications: vi.fn(),
}))

// RootLayout reads hasToken() (-> localStorage.getItem) on mount. Other suites in this repo
// stub `localStorage` for the same reason (see src/api/client.test.js, src/api/auth.test.js) —
// under this toolchain's jsdom + Node combination, globalThis.localStorage is not populated
// for us, so an unstubbed render throws before any assertion runs.
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

// hasToken() is `!!localStorage.getItem('token')`, so seeding the key is what makes the shell
// render its signed-in chrome (TabBar, command palette, notification bell).
function signIn() {
  localStorage.setItem('token', 'test-token')
}

function SignOutProbe() {
  const { onSignOut } = useOutletContext()
  return (
    <button type="button" onClick={onSignOut}>
      probe sign out
    </button>
  )
}

function renderShell(page = <p>page body</p>) {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route element={<RootLayout />}>
          <Route path="/" element={page} />
        </Route>
      </Routes>
    </MemoryRouter>,
  )
}

describe('RootLayout shell', () => {
  it('reserves space below main so the fixed tab bar cannot cover content', () => {
    signIn()
    renderShell()
    expect(screen.getByRole('main').className).toContain('pb-shell-b')
  })

  // TabBar renders null when signed out, so reserving its height would be dead space on
  // every signed-out mobile page.
  it('reserves no tab-bar space when signed out, where there is no tab bar', () => {
    renderShell()
    expect(screen.getByRole('main').className).not.toContain('pb-shell-b')
  })

  it('uses dynamic viewport height so a collapsing URL bar cannot orphan the background', () => {
    const { container } = renderShell()
    expect(container.querySelector('.min-h-dvh')).not.toBeNull()
    expect(container.querySelector('.min-h-screen')).toBeNull()
  })

  // The branch's headline feature is the bottom tab bar, and it is only ever mounted from
  // here. Without this, deleting <TabBar /> from RootLayout leaves every test green.
  it('mounts the bottom tab bar when signed in, so phones can reach the account page', () => {
    signIn()
    renderShell()

    const account = screen.getByRole('link', { name: /account/i })
    expect(account).toHaveAttribute('href', '/profile')
    expect(account.closest('nav')).toHaveAttribute('aria-label', 'Primary')
  })

  it('does not mount the tab bar when signed out', () => {
    renderShell()
    expect(screen.queryByRole('link', { name: /account/i })).toBeNull()
  })

  // onSignOut is handed to routes through Outlet context and, since Sign Out moved to
  // /profile, it is the app's only sign-out path.
  it('onSignOut clears the session and drops the signed-in chrome', async () => {
    signIn()
    renderShell(<SignOutProbe />)
    expect(screen.getByRole('link', { name: /account/i })).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /probe sign out/i }))

    expect(logout).toHaveBeenCalledOnce()
    expect(screen.queryByRole('link', { name: /account/i })).toBeNull()
  })
})
