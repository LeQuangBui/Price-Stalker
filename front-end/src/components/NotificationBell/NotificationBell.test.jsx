import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import NotificationBell from './NotificationBell'
import { getNotifications } from '../../api/notifications'

vi.mock('../../api/notifications', () => ({
  getNotifications: vi.fn(),
}))

function renderBell() {
  return render(
    <MemoryRouter>
      <NotificationBell />
    </MemoryRouter>
  )
}

describe('NotificationBell', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('lists notifications when opened and deep-links to the internal product route', async () => {
    getNotifications.mockResolvedValue([
      {
        eventId: 'evt-1',
        productId: 'product-1',
        productName: 'GTX 4070',
        productUrl: 'https://example.com/p',
        sentAt: '2026-04-25T10:00:00Z',
      },
    ])

    renderBell()
    fireEvent.click(screen.getByRole('button', { name: /notifications/i }))

    const link = await screen.findByText('GTX 4070')
    // Internal route (H7), not the merchant URL.
    expect(link.closest('a')).toHaveAttribute('href', '/products/product-1')
  })

  it('shows an empty state when there are no notifications', async () => {
    getNotifications.mockResolvedValue([])

    renderBell()
    fireEvent.click(screen.getByRole('button', { name: /notifications/i }))

    expect(await screen.findByText(/no price-drop notifications yet/i)).toBeInTheDocument()
  })

  it('pulses when a drop is newer than last-seen, and clears the pulse on open', async () => {
    getNotifications.mockResolvedValue([
      { eventId: 'e', productId: 'p', productName: 'X', sentAt: new Date().toISOString() },
    ])

    renderBell()

    // Mount probe finds a fresh drop → the accessible name flips to "(new)".
    const newBtn = await screen.findByRole('button', { name: /notifications \(new\)/i })
    fireEvent.click(newBtn)

    // Opening records "seen" and clears the pulse.
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /^notifications$/i })).toBeInTheDocument()
    )
  })
})
