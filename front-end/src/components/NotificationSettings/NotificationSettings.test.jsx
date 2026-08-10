import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import NotificationSettings from './NotificationSettings'
import { usePushNotifications } from '../../push/usePushNotifications'

vi.mock('../../push/usePushNotifications', () => ({
  usePushNotifications: vi.fn(),
}))

const base = {
  supported: true,
  permission: 'default',
  subscribed: false,
  busy: false,
  error: '',
  info: '',
  enable: vi.fn(),
  disable: vi.fn(),
  sendTest: vi.fn(),
}

describe('NotificationSettings', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('explains the limitation when push is unsupported', () => {
    usePushNotifications.mockReturnValue({ ...base, supported: false, permission: 'unsupported' })

    render(<NotificationSettings />)

    expect(screen.getByText(/doesn’t support web-push/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /enable/i })).not.toBeInTheDocument()
  })

  it('enables push when the Enable button is clicked', () => {
    const enable = vi.fn()
    usePushNotifications.mockReturnValue({ ...base, enable })

    render(<NotificationSettings />)
    fireEvent.click(screen.getByRole('button', { name: /enable/i }))

    expect(enable).toHaveBeenCalledTimes(1)
  })

  it('shows the test button and turn-off control when subscribed', () => {
    const sendTest = vi.fn()
    usePushNotifications.mockReturnValue({ ...base, subscribed: true, sendTest })

    render(<NotificationSettings />)
    expect(screen.getByRole('button', { name: /turn off/i })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /send test notification/i }))
    expect(sendTest).toHaveBeenCalledTimes(1)
  })

  // Hand-rolled, this button was 77.77x36 at 320px and the only sub-44px control left inside
  // `<main>` on /profile. `.btn` carries the flat 44px floor and `min-h-11` grows it with the
  // reader; `shrink-0` is what pinned its right edge 71px past a 320px viewport at a 24px browser
  // default, so its absence is asserted too. Nothing else in the tree measures this element.
  it('puts the toggle on the button primitive, with a floor that grows and no shrink pin', () => {
    for (const subscribed of [false, true]) {
      usePushNotifications.mockReturnValue({ ...base, subscribed })
      const { unmount } = render(<NotificationSettings />)
      const toggle = screen.getByRole('button', { name: subscribed ? /turn off/i : /enable/i })
      const classes = toggle.className.split(/\s+/)
      expect(classes).toContain('btn')
      expect(classes).toContain('min-h-11')
      expect(classes).toContain(subscribed ? 'btn-secondary' : 'btn-primary')
      expect(classes).not.toContain('shrink-0')
      unmount()
    }
  })

  it('surfaces a blocked-permission note', () => {
    usePushNotifications.mockReturnValue({ ...base, permission: 'denied' })

    render(<NotificationSettings />)
    expect(screen.getByText(/notifications are blocked/i)).toBeInTheDocument()
  })
})
