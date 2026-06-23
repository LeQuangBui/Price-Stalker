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

  it('surfaces a blocked-permission note', () => {
    usePushNotifications.mockReturnValue({ ...base, permission: 'denied' })

    render(<NotificationSettings />)
    expect(screen.getByText(/notifications are blocked/i)).toBeInTheDocument()
  })
})
