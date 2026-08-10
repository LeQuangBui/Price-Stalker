import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Outlet, Route, Routes } from 'react-router-dom'
import UserProfile from './UserProfile'
import { getUserProfile } from '../../api/auth'

vi.mock('../../api/auth', () => ({
  getUserProfile: vi.fn(),
  isUnauthorizedError: vi.fn(() => false),
}))

// NotificationSettings renders an Enable button whenever usePushNotifications reports
// `supported: true`, and isPushSupported() needs `'serviceWorker' in navigator`, which jsdom does
// not provide. So the button is absent here by accident of the environment, not by anything this
// page controls — and the button-counting assertion below would change meaning the day that
// environment does. Pin it instead. Both of the module's exports are stubbed even though only one
// is reached today, so a future import cannot resolve to undefined.
vi.mock('../../push/usePushNotifications', () => ({
  isPushSupported: () => false,
  usePushNotifications: () => ({
    supported: false, permission: 'unsupported', subscribed: false, busy: false,
    error: '', info: '', enable: vi.fn(), disable: vi.fn(), sendTest: vi.fn(),
  }),
}))

// UserProfile.jsx:41 destructures useOutletContext() unguarded, so the Outlet harness is mandatory.
function renderProfile() {
  return render(
    <MemoryRouter initialEntries={['/profile']}>
      <Routes>
        <Route element={<Outlet context={{ isSignedIn: true, onSignOut: vi.fn() }} />}>
          <Route path="/profile" element={<UserProfile />} />
        </Route>
      </Routes>
    </MemoryRouter>,
  )
}

const classesOf = (el) => el.className.split(/\s+/)

const profile = (over = {}) => ({
  username: 'hung', email: 'hung@example.com', createdAt: '2024-01-01T00:00:00Z',
  bookmarks: [], ...over,
})

describe('UserProfile layout', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getUserProfile.mockResolvedValue(profile())
  })

  it('carries no class owned by a retired stylesheet', async () => {
    getUserProfile.mockResolvedValue(profile({
      bookmarks: [{ id: 'b1', name: 'Kitchen watch', createdAt: '2024-01-01T00:00:00Z', products: [] }],
    }))
    const { container } = renderProfile()
    await screen.findByText(/kitchen watch/i)

    for (const cls of [
      'user-profile-container', 'profile-section', 'profile-item', 'profile-label', 'profile-value',
      'profile-actions', 'profile-action-link', 'bookmarks-section', 'bookmarks-list',
      'bookmark-item', 'bookmark-info', 'bookmark-name', 'bookmark-date', 'no-bookmarks',
    ]) {
      expect(container.querySelector(`.${cls}`), `${cls} should be gone`).toBeNull()
    }
  })

  it('puts both action links on the button primitive with an explicit 44px floor', async () => {
    renderProfile()
    for (const name of [/view bookmarks/i, /manage alerts/i]) {
      const link = await screen.findByRole('link', { name })
      expect(classesOf(link)).toContain('btn')
      expect(classesOf(link)).toContain('min-h-11')
    }
  })

  it('spends less of a phone on section padding than it does a desktop', async () => {
    const { container } = renderProfile()
    await screen.findByText(/hung@example\.com/)
    const section = container.querySelector('.md\\:p-8')
    expect(section).not.toBeNull()
    expect(classesOf(section)).toContain('p-5')
  })

  it('renders the shared empty state, and adds no second button beside Sign Out', async () => {
    renderProfile()
    expect(await screen.findByRole('heading', { name: /no bookmarks yet/i })).toBeVisible()
    expect(screen.getAllByRole('button')).toHaveLength(1)
    expect(screen.getByRole('button')).toHaveAccessibleName(/sign out/i)
  })

  it('keeps the bookmark name distinct from its meta lines', async () => {
    getUserProfile.mockResolvedValue(profile({
      bookmarks: [{ id: 'b1', name: 'Kitchen watch', createdAt: '2024-01-01T00:00:00Z', products: [] }],
    }))
    renderProfile()
    // The name must not inherit the meta lines' size and colour — it did until this slice, because
    // `Bookmarks.css`'s `.bookmark-info` block (retired in 2b-ii) was reaching this page through
    // the shared class name and rendering all three lines at 14px in the same grey.
    expect(classesOf(await screen.findByText('Kitchen watch'))).toContain('font-bold')
    expect(classesOf(screen.getByText(/^Created /))).toContain('text-sm')
  })
})
