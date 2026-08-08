import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route, Outlet } from 'react-router-dom'
import UserProfile from './UserProfile'
import { getUserProfile } from '../../api/auth'

// UserProfile fetches the profile on mount via api/auth's getUserProfile (which itself
// reads localStorage through client.js). Rather than stub localStorage + fetch end to end
// (the Map-backed vi.stubGlobal pattern used in RootLayout.test.jsx / client.test.js /
// auth.test.js), mock the api/auth module directly so the Sign Out control's own render
// path is what's under test here.
vi.mock('../../api/auth', () => ({
  getUserProfile: vi.fn(),
  isUnauthorizedError: vi.fn(() => false),
}))

function renderProfile(onSignOut = vi.fn()) {
  render(
    <MemoryRouter initialEntries={['/profile']}>
      <Routes>
        <Route element={<Outlet context={{ isSignedIn: true, onSignOut }} />}>
          <Route path="/profile" element={<UserProfile />} />
        </Route>
      </Routes>
    </MemoryRouter>,
  )
  return onSignOut
}

describe('UserProfile sign out', () => {
  beforeEach(() => {
    getUserProfile.mockResolvedValue({
      username: 'hung',
      email: 'hung@example.com',
      createdAt: '2024-01-01T00:00:00Z',
      bookmarks: [],
    })
  })

  it('renders a Sign Out control', async () => {
    renderProfile()
    expect(await screen.findByRole('button', { name: /sign out/i })).toBeVisible()
  })

  it('calls onSignOut when pressed', async () => {
    const onSignOut = renderProfile()
    await userEvent.click(await screen.findByRole('button', { name: /sign out/i }))
    expect(onSignOut).toHaveBeenCalledOnce()
  })
})
