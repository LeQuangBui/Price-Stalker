import { fireEvent, render, screen } from '@testing-library/react'
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

  it('does not fetch until opened, then lists notifications', async () => {
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
    expect(getNotifications).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: /notifications/i }))

    const link = await screen.findByText('GTX 4070')
    expect(getNotifications).toHaveBeenCalledTimes(1)
    // Clicking navigates to the internal product route (H7), not the merchant URL.
    expect(link.closest('a')).toHaveAttribute('href', '/products/product-1')
  })

  it('shows an empty state when there are no notifications', async () => {
    getNotifications.mockResolvedValue([])

    renderBell()
    fireEvent.click(screen.getByRole('button', { name: /notifications/i }))

    expect(await screen.findByText(/no price-drop notifications yet/i)).toBeInTheDocument()
  })
})
