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

  // `.btn` is where the 44px touch target lives (index.css). Guarding the rule alone leaves the
  // usage free to drop the class, so assert the button actually opts in.
  it('carries the .btn primitive that supplies the 44px touch target', async () => {
    renderProfile()
    expect((await screen.findByRole('button', { name: /sign out/i })).className).toMatch(/(^|\s)btn(\s|$)/)
  })

  it('calls onSignOut when pressed', async () => {
    const onSignOut = renderProfile()
    await userEvent.click(await screen.findByRole('button', { name: /sign out/i }))
    expect(onSignOut).toHaveBeenCalledOnce()
  })

  // This is the app's only sign-out control, so it cannot live behind the success branch:
  // a backend 500 / offline / CORS failure would otherwise lock the user into the session.
  // (401 is the one failure that self-heals — isUnauthorizedError sends you to /login.)
  it('still offers sign out when the profile fetch fails', async () => {
    getUserProfile.mockRejectedValue(new Error('Internal Server Error'))
    const onSignOut = renderProfile()

    const button = await screen.findByRole('button', { name: /sign out/i })
    expect(button).toBeVisible()

    await userEvent.click(button)
    expect(onSignOut).toHaveBeenCalledOnce()
  })
})
