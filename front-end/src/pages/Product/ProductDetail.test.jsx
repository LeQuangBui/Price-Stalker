import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom'
import ProductDetail from './ProductDetail'
import { getProduct } from '../../api/products'
import { createAlert, deleteAlert, findAlertForProduct, updateAlert } from '../../api/alerts'

// Characterization test, written before the CSS conversion and green against the unconverted page.
// Queried by role, accessible name, attribute or inline style — never by class — so nothing here
// needs an edit when the 334-line stylesheet goes.
vi.mock('../../api/products', () => ({
  getProduct: vi.fn(),
  // PriceHistoryChart fetches this on mount. Without it every test in the file throws.
  getPriceHistory: vi.fn(async () => []),
}))
vi.mock('../../api/alerts', () => ({
  findAlertForProduct: vi.fn(),
  createAlert: vi.fn(),
  updateAlert: vi.fn(),
  deleteAlert: vi.fn(),
}))
vi.mock('../../api/auth', () => ({ isUnauthorizedError: vi.fn(() => false) }))
vi.mock('../../api/bookmarks', () => ({
  getBookmarks: vi.fn(async () => ({ content: [] })),
  createBookmark: vi.fn(),
  updateBookmark: vi.fn(),
}))

const product = (over = {}) => ({
  id: 'p1', name: 'Espresso Machine', sku: 'ESP-1', currency: 'VND',
  price: 1290000, originalPrice: null, flashSalePrice: null,
  url: 'https://www.shopee.vn/item/1', images: ['/a.jpg'],
  createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-02-01T00:00:00Z', ...over,
})

const threeImages = ['/a.jpg', '/b.jpg', '/c.jpg']

const renderPage = ({ isSignedIn = false } = {}) =>
  render(
    <MemoryRouter initialEntries={['/products/p1']}>
      <Routes>
        <Route path="/products/:id" element={<ProductDetail isSignedIn={isSignedIn} />} />
      </Routes>
    </MemoryRouter>,
  )

// The track is the only element carrying an inline translateX, and the conversion does not move
// that inline style — it is what drives the paging. Class-independent by construction.
const track = (container) => container.querySelector('[style*="translateX"]')

// MemoryRouter reads initialEntries once, at mount, so a rerender cannot change the :id. This can,
// on the same component instance — which is the only thing that makes the two effects' `cancelled`
// guards observable.
function GoTo({ to }) {
  const navigate = useNavigate()
  return <button type="button" onClick={() => navigate(to)}>go</button>
}
const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

describe('ProductDetail page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getProduct.mockResolvedValue(product())
    findAlertForProduct.mockResolvedValue(null)
  })

  it('announces loading before the first response lands', () => {
    getProduct.mockReturnValue(new Promise(() => {}))
    renderPage()
    expect(screen.getByRole('status')).toHaveTextContent(/loading product/i)
  })

  it('offers a retry when the fetch fails, and refetches on it', async () => {
    getProduct.mockRejectedValue(new Error('Internal Server Error'))
    renderPage()
    expect(await screen.findByText(/internal server error/i)).toBeVisible()

    getProduct.mockResolvedValue(product())
    await userEvent.click(screen.getByRole('button', { name: /retry/i }))
    expect(await screen.findByRole('heading', { name: /espresso machine/i })).toBeVisible()
    expect(getProduct).toHaveBeenCalledTimes(2)
  })

  it('says so when the fetch succeeds with nothing', async () => {
    getProduct.mockResolvedValue(null)
    renderPage()
    expect(await screen.findByText(/product not found/i)).toBeVisible()
  })

  it('renders the hero: source, name, price and both outbound links', async () => {
    renderPage()
    expect(await screen.findByRole('heading', { name: /espresso machine/i })).toBeVisible()
    // The Kicker's WHOLE string, not just the host. `hostOf(product.url)` renders twice — Kicker at
    // :285 and SectionHeader's meta at :388 — so /shopee\.vn/ alone finds two elements. Matching
    // the host and the sku together picks out the Kicker and is this file's only cover for the
    // ` · ${product.sku}` suffix at :286.
    expect(screen.getByText(/shopee\.vn · ESP-1/)).toBeVisible()
    expect(screen.getByText(/1[.,]290[.,]000/)).toBeVisible()
    expect(screen.getByRole('link', { name: /back to products/i })).toHaveAttribute('href', '/')
    expect(screen.getByRole('link', { name: /view on website/i }))
      .toHaveAttribute('href', 'https://www.shopee.vn/item/1')
  })

  it('renders the placeholder when the product has no images', async () => {
    getProduct.mockResolvedValue(product({ images: [] }))
    renderPage()
    expect(await screen.findByText(/no image available/i)).toBeVisible()
    expect(screen.queryByRole('button', { name: /next image/i })).toBeNull()
  })

  it('renders a single image with no gallery controls', async () => {
    renderPage()
    expect(await screen.findByRole('img', { name: /espresso machine 1/i })).toBeVisible()
    expect(screen.queryByRole('button', { name: /previous image/i })).toBeNull()
    expect(screen.queryByRole('button', { name: /go to image 1/i })).toBeNull()
  })

  it('renders arrows and one dot per image once there is more than one', async () => {
    getProduct.mockResolvedValue(product({ images: threeImages }))
    renderPage()
    expect(await screen.findByRole('button', { name: /previous image/i })).toBeVisible()
    expect(screen.getByRole('button', { name: /next image/i })).toBeVisible()
    expect(screen.getAllByRole('img')).toHaveLength(3)
    for (const n of [1, 2, 3]) {
      expect(screen.getByRole('button', { name: `Go to image ${n}` })).toBeVisible()
    }
  })

  // The paging is an inline transform driven by `slide` state and animated by one CSS declaration.
  // These three assertions are the whole behaviour: next, wrap-around on prev, and direct jump.
  it('pages the track by transform, wrapping at both ends', async () => {
    getProduct.mockResolvedValue(product({ images: threeImages }))
    const { container } = renderPage()
    await screen.findByRole('button', { name: /next image/i })

    await userEvent.click(screen.getByRole('button', { name: /next image/i }))
    expect(track(container).style.transform).toBe('translateX(-100%)')

    await userEvent.click(screen.getByRole('button', { name: /previous image/i }))
    await userEvent.click(screen.getByRole('button', { name: /previous image/i }))
    expect(track(container).style.transform).toBe('translateX(-200%)')

    await userEvent.click(screen.getByRole('button', { name: 'Go to image 1' }))
    expect(track(container).style.transform).toBe('translateX(-0%)')
  })

  it('asks a signed-out reader to sign in instead of showing the alert form', async () => {
    renderPage()
    expect(await screen.findByText(/sign in to bookmark this product/i)).toBeVisible()
    expect(screen.queryByRole('spinbutton')).toBeNull()
    expect(screen.queryByRole('button', { name: /create alert/i })).toBeNull()
  })

  it('offers to create an alert when the reader has none, and sends the threshold', async () => {
    createAlert.mockResolvedValue({ id: 'al1', thresholdPrice: 880000, active: true })
    renderPage({ isSignedIn: true })

    const input = await screen.findByLabelText(/threshold price/i)
    expect(screen.getByText(/current price:/i)).toBeVisible()
    expect(screen.queryByText(/^Active$/)).toBeNull()
    expect(screen.queryByRole('checkbox')).toBeNull()
    expect(screen.queryByRole('button', { name: /delete alert/i })).toBeNull()

    await userEvent.type(input, '880000')
    await userEvent.click(screen.getByRole('button', { name: /create alert/i }))
    await waitFor(() => expect(createAlert).toHaveBeenCalledWith({
      productId: 'p1', thresholdPrice: 880000,
    }))
    expect(await screen.findByText(/alert created/i)).toBeVisible()
  })

  it('refuses to submit an empty threshold', async () => {
    renderPage({ isSignedIn: true })
    await screen.findByLabelText(/threshold price/i)
    await userEvent.click(screen.getByRole('button', { name: /create alert/i }))
    expect(await screen.findByText(/threshold price is required/i)).toBeVisible()
    expect(createAlert).not.toHaveBeenCalled()
  })

  it('shows the full edit branch when an alert already exists', async () => {
    findAlertForProduct.mockResolvedValue({ id: 'al1', thresholdPrice: 990000, active: true })
    updateAlert.mockResolvedValue({ id: 'al1', thresholdPrice: 880000, active: true })
    renderPage({ isSignedIn: true })

    expect(await screen.findByText('Active')).toBeVisible()
    expect(screen.getByRole('checkbox')).toBeChecked()
    expect(screen.getByRole('button', { name: /delete alert/i })).toBeVisible()

    const input = screen.getByLabelText(/threshold price/i)
    await userEvent.clear(input)
    await userEvent.type(input, '880000')
    await userEvent.click(screen.getByRole('button', { name: /update alert/i }))
    await waitFor(() => expect(updateAlert).toHaveBeenCalledWith('al1', {
      thresholdPrice: 880000, active: true,
    }))
  })

  it('reads Paused when the existing alert is inactive', async () => {
    findAlertForProduct.mockResolvedValue({ id: 'al1', thresholdPrice: 990000, active: false })
    renderPage({ isSignedIn: true })
    expect(await screen.findByText('Paused')).toBeVisible()
    expect(screen.getByRole('checkbox')).not.toBeChecked()
  })

  it('deletes the alert only after the confirmation dialog is accepted', async () => {
    findAlertForProduct.mockResolvedValue({ id: 'al1', thresholdPrice: 990000, active: true })
    deleteAlert.mockResolvedValue({})
    renderPage({ isSignedIn: true })

    await userEvent.click(await screen.findByRole('button', { name: /delete alert/i }))
    const dialog = screen.getByRole('dialog', { hidden: true })
    expect(within(dialog).getByText(/delete this alert\?/i)).toBeInTheDocument()

    await userEvent.click(within(dialog).getByRole('button', { name: /^delete$/i }))
    await waitFor(() => expect(deleteAlert).toHaveBeenCalledWith('al1'))
    expect(await screen.findByText(/alert deleted/i)).toBeVisible()
    expect(screen.getByRole('button', { name: /create alert/i })).toBeVisible()
  })

  // Pinned, not endorsed. `alertLoading` is set true by the FETCH effect (ProductDetail.jsx:85) and
  // the submit button reads it (:358), so a signed-in reader's first paint is a disabled button
  // labelled "Saving...". Holding the alert fetch open is what makes that deterministic rather than
  // a race between two mocked promises. This slice preserves it; see the Self-Review.
  it('labels the submit button "Saving..." while the initial alert fetch is still open', async () => {
    findAlertForProduct.mockReturnValue(new Promise(() => {}))
    renderPage({ isSignedIn: true })
    const button = await screen.findByRole('button', { name: /saving/i })
    expect(button).toBeDisabled()
  })

  // The two `cancelled` guards (:53-73 and :75-108). Both are exercised the same way — move to a
  // second product while the first request is still open, then resolve the stale one LAST — because
  // that is the guard's actual job and the only thing that distinguishes it from its own absence.
  //
  // Do NOT replace either of these with an unmount test. React 18 bails out of setState on an
  // unmounted fiber in silence: no warning, no act() complaint, nothing to assert. Checked by
  // deleting `if (cancelled) return` and re-running — an unmount test stays green, and these two go
  // red, which is the only reason they are here.
  it('drops a stale product response when the reader has already moved on', async () => {
    let releaseP1
    getProduct.mockImplementation((id) => (id === 'p1'
      ? new Promise((resolve) => { releaseP1 = resolve })
      : Promise.resolve(product({ id: 'p2', name: 'Burr Grinder' }))))

    render(
      <MemoryRouter initialEntries={['/products/p1']}>
        <GoTo to="/products/p2" />
        <Routes>
          <Route path="/products/:id" element={<ProductDetail isSignedIn={false} />} />
        </Routes>
      </MemoryRouter>,
    )
    await screen.findByRole('status')
    await userEvent.click(screen.getByRole('button', { name: 'go' }))
    expect(await screen.findByRole('heading', { name: /burr grinder/i })).toBeVisible()

    releaseP1(product())
    await flush()
    expect(screen.getByRole('heading', { name: /burr grinder/i })).toBeVisible()
    expect(screen.queryByRole('heading', { name: /espresso machine/i })).toBeNull()
  })

  it('drops a stale alert response when the reader has already moved on', async () => {
    getProduct.mockImplementation(async (id) => (id === 'p1'
      ? product()
      : product({ id: 'p2', name: 'Burr Grinder' })))
    let releaseP1
    findAlertForProduct.mockImplementation((id) => (id === 'p1'
      ? new Promise((resolve) => { releaseP1 = resolve })
      : Promise.resolve({ id: 'al2', thresholdPrice: 111111, active: true })))

    render(
      <MemoryRouter initialEntries={['/products/p1']}>
        <GoTo to="/products/p2" />
        <Routes>
          <Route path="/products/:id" element={<ProductDetail isSignedIn />} />
        </Routes>
      </MemoryRouter>,
    )
    await screen.findByRole('heading', { name: /espresso machine/i })
    await userEvent.click(screen.getByRole('button', { name: 'go' }))
    await screen.findByRole('heading', { name: /burr grinder/i })
    expect(await screen.findByLabelText(/threshold price/i)).toHaveValue(111111)

    releaseP1({ id: 'al1', thresholdPrice: 990000, active: false })
    await flush()
    expect(screen.getByLabelText(/threshold price/i)).toHaveValue(111111)
    expect(screen.getByRole('checkbox')).toBeChecked()
  })
})
