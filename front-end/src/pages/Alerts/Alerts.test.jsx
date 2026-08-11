import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import Alerts from './Alerts'
import { deleteAlert, getAlerts, updateAlert } from '../../api/alerts'

// Characterization test, written before the CSS conversion and green against the unconverted page.
// Its job is to pin behaviour that a 174-line stylesheet retirement could silently break, not to
// describe an intended design. Everything is queried by role, accessible name or attribute — never
// by class — so the file survives the conversion without an edit.
vi.mock('../../api/alerts', () => ({
  getAlerts: vi.fn(),
  updateAlert: vi.fn(),
  deleteAlert: vi.fn(),
}))
vi.mock('../../api/auth', () => ({ isUnauthorizedError: vi.fn(() => false) }))

const product = (over = {}) => ({
  id: 'p1', name: 'Espresso Machine', currency: 'VND', price: 1290000,
  originalPrice: null, flashSalePrice: null, images: [], ...over,
})

const alert = (over = {}) => ({
  id: 'a1', thresholdPrice: 990000, active: true, product: product(), ...over,
})

const renderPage = () => render(<MemoryRouter><Alerts /></MemoryRouter>)

describe('Alerts page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getAlerts.mockResolvedValue({ content: [alert()], totalPages: 1 })
  })

  it('announces loading before the first response lands', () => {
    getAlerts.mockReturnValue(new Promise(() => {}))
    renderPage()
    expect(screen.getByRole('status')).toHaveTextContent(/loading alerts/i)
  })

  it('offers a retry when the fetch fails', async () => {
    getAlerts.mockRejectedValue(new Error('Internal Server Error'))
    renderPage()
    expect(await screen.findByText(/internal server error/i)).toBeVisible()

    getAlerts.mockResolvedValue({ content: [alert()], totalPages: 1 })
    await userEvent.click(screen.getByRole('button', { name: /retry/i }))
    expect(await screen.findByRole('link', { name: /espresso machine/i })).toBeVisible()
  })

  // Scoped through the heading's parent, not by role. `Browse products` is rendered twice on this
  // branch — the page header renders one on EVERY branch (Alerts.jsx:153) and the empty state
  // renders its own (:181) — so an unscoped query throws `Found multiple elements`. The panel has
  // no role until Task 6 adopts EmptyState, and a characterization test may not depend on the
  // change it exists to characterize; the heading's parent is the structure both versions share.
  it('shows an empty state with a browse affordance when there are no alerts', async () => {
    getAlerts.mockResolvedValue({ content: [], totalPages: 0 })
    renderPage()
    const heading = await screen.findByRole('heading', { name: /no price alerts yet/i })
    expect(heading).toBeVisible()
    expect(within(heading.parentElement).getByRole('link', { name: /browse products/i }))
      .toBeVisible()
  })

  it('renders a card with its product link, current price, threshold and active toggle', async () => {
    renderPage()
    const link = await screen.findByRole('link', { name: /espresso machine/i })
    expect(link).toHaveAttribute('href', '/products/p1')
    // Digit-group separators, not the exact string: formatPrice pins vi-VN for VND, but this is
    // the page's only coverage of getTrackedPrice -> formatPrice and it should not be the thing
    // that goes red on a tree without that pin, where the same value is `VND 1,290,000`.
    expect(screen.getByText(/1[.,]290[.,]000/)).toBeVisible()
    expect(screen.getByRole('spinbutton')).toHaveValue(990000)
    expect(screen.getByRole('checkbox')).toBeChecked()
    // The native tooltip on the Active control. Nothing else in the tree would go red if a rewrite
    // dropped it.
    expect(screen.getByTitle(/won't send emails/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^save$/i })).toBeDisabled()
    expect(screen.getByRole('button', { name: /^delete$/i })).toBeEnabled()
  })

  it('falls back to a placeholder name when the alert has no product', async () => {
    getAlerts.mockResolvedValue({ content: [alert({ product: null })], totalPages: 1 })
    renderPage()
    // Pinned, not endorsed: `to={`/products/${alert.product?.id}`}` has no guard, so a null product
    // links to /products/undefined. This slice preserves it; see the Self-Review.
    const link = await screen.findByRole('link', { name: /unknown product/i })
    expect(link).toHaveAttribute('href', '/products/undefined')
  })

  it('enables Save once the threshold diverges, and sends the edited value', async () => {
    updateAlert.mockResolvedValue(alert({ thresholdPrice: 880000 }))
    renderPage()
    const input = await screen.findByRole('spinbutton')
    await userEvent.clear(input)
    await userEvent.type(input, '880000')

    const save = screen.getByRole('button', { name: /^save$/i })
    expect(save).toBeEnabled()
    await userEvent.click(save)
    await waitFor(() => expect(updateAlert).toHaveBeenCalledWith('a1', {
      thresholdPrice: 880000, active: true,
    }))
  })

  it('sends the toggle state with the save', async () => {
    updateAlert.mockResolvedValue(alert({ active: false }))
    renderPage()
    await userEvent.click(await screen.findByRole('checkbox'))
    await userEvent.click(screen.getByRole('button', { name: /^save$/i }))
    await waitFor(() => expect(updateAlert).toHaveBeenCalledWith('a1', {
      thresholdPrice: 990000, active: false,
    }))
  })

  // `savingId` is the only per-row in-flight state on this page and nothing else pins it: the label
  // and the `disabled` are both attribute-level differences on a card whose markup never otherwise
  // varies (:231, :233), which is exactly the shape a rewrite drops in silence. Holding the update
  // open is what makes the in-flight paint observable rather than a race between two resolved
  // promises.
  it('disables Save and reads "Saving..." while the update is in flight', async () => {
    let release
    updateAlert.mockReturnValue(new Promise((resolve) => { release = resolve }))
    renderPage()
    const input = await screen.findByRole('spinbutton')
    await userEvent.clear(input)
    await userEvent.type(input, '880000')
    await userEvent.click(screen.getByRole('button', { name: /^save$/i }))

    const saving = await screen.findByRole('button', { name: /saving/i })
    expect(saving).toBeDisabled()

    // And it comes back — as "Save", disabled again, because the draft now matches the server.
    release(alert({ thresholdPrice: 880000 }))
    await waitFor(() => expect(screen.getByRole('button', { name: /^save$/i })).toBeDisabled())
  })

  // The four render conditions are independent booleans, not a state machine, so a validation
  // failure paints an error box ABOVE a populated list. A conversion that assumes exclusivity —
  // an if/else if/else, or an early return — silently loses one of the two.
  it('shows a validation error above the list rather than instead of it', async () => {
    renderPage()
    const input = await screen.findByRole('spinbutton')
    await userEvent.clear(input)
    await userEvent.click(screen.getByRole('button', { name: /^save$/i }))

    expect(await screen.findByText(/threshold price is required/i)).toBeVisible()
    expect(screen.getByRole('link', { name: /espresso machine/i })).toBeVisible()
    expect(updateAlert).not.toHaveBeenCalled()
  })

  it('deletes an alert only after the confirmation dialog is accepted', async () => {
    deleteAlert.mockResolvedValue({})
    renderPage()
    await userEvent.click(await screen.findByRole('button', { name: /^delete$/i }))

    const dialog = screen.getByRole('dialog', { hidden: true })
    expect(within(dialog).getByText(/delete this alert\?/i)).toBeInTheDocument()

    await userEvent.click(within(dialog).getByRole('button', { name: /^delete$/i }))
    await waitFor(() => expect(deleteAlert).toHaveBeenCalledWith('a1'))
    await waitFor(() => expect(screen.queryByRole('link', { name: /espresso machine/i })).toBeNull())
  })

  it('pages through more than one page of alerts', async () => {
    getAlerts.mockResolvedValue({ content: [alert()], totalPages: 3 })
    renderPage()
    await userEvent.click(await screen.findByRole('button', { name: /next/i }))
    await waitFor(() => expect(getAlerts).toHaveBeenLastCalledWith({ page: 1, size: 20 }))
  })
})
