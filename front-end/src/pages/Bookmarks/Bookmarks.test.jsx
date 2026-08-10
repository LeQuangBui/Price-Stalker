import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import Bookmarks from './Bookmarks'
import { createBookmark, deleteBookmark, getBookmarks, updateBookmark } from '../../api/bookmarks'

// Characterization test, written before the CSS conversion against the unconverted page. Its job
// is to pin behaviour that a 316-line stylesheet retirement could silently break, not to describe
// an intended design.
vi.mock('../../api/bookmarks', () => ({
  getBookmarks: vi.fn(),
  createBookmark: vi.fn(),
  updateBookmark: vi.fn(),
  deleteBookmark: vi.fn(),
}))
vi.mock('../../api/auth', () => ({ isUnauthorizedError: vi.fn(() => false) }))
// ProductSearch and AddByUrl render inside an expanded card. Neither fetches on mount — the search
// is debounced behind a keystroke and the URL flow behind a submit — but mocking the module keeps
// the expanded branch hermetic rather than one stray keystroke away from a real request.
vi.mock('../../api/products', () => ({
  getProducts: vi.fn(async () => ({ content: [] })),
  getProduct: vi.fn(),
  createProductExtraction: vi.fn(),
  getProductExtraction: vi.fn(),
}))

const product = (over = {}) => ({
  id: 'p1', name: 'Espresso Machine', currency: 'VND', price: 1290000,
  originalPrice: null, flashSalePrice: null, images: [], ...over,
})

// The default fixture has no images, so getPrimaryImage() is falsy and the placeholder arm is the
// only one that renders. This is the other arm. Keep both exercised: Task 7 sizes them from one
// shared const and the whole point of that const is that neither half can drift.
const withImage = (over = {}) =>
  product({ images: ['https://images.example.test/espresso.jpg'], ...over })

const bookmark = (over = {}) => ({
  id: 'b1', name: 'Kitchen watch', createdAt: '2024-01-01T00:00:00Z', products: [], ...over,
})

const renderPage = () => render(<MemoryRouter><Bookmarks /></MemoryRouter>)

describe('Bookmarks page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getBookmarks.mockResolvedValue({ content: [bookmark()], totalPages: 1 })
  })

  it('announces loading before the first response lands', () => {
    getBookmarks.mockReturnValue(new Promise(() => {}))
    renderPage()
    expect(screen.getByRole('status')).toHaveTextContent(/loading bookmarks/i)
  })

  it('offers a retry when the fetch fails and there is nothing to show', async () => {
    getBookmarks.mockRejectedValue(new Error('Internal Server Error'))
    renderPage()
    expect(await screen.findByText(/internal server error/i)).toBeVisible()
    expect(screen.getByRole('button', { name: /retry/i })).toBeVisible()
  })

  it('shows an empty state with a create affordance when there are no bookmarks', async () => {
    getBookmarks.mockResolvedValue({ content: [], totalPages: 0 })
    renderPage()
    expect(await screen.findByRole('heading', { name: /no bookmarks yet/i })).toBeVisible()
    expect(screen.getAllByRole('button', { name: /new bookmark/i }).length).toBeGreaterThan(0)
  })

  it('renders a collapsed card with its name, product count and created date', async () => {
    renderPage()
    expect(await screen.findByRole('heading', { name: /kitchen watch/i })).toBeVisible()
    expect(screen.getByText(/0 products/i)).toBeVisible()
    // The date string itself is locale-dependent — formatDate passes `undefined` to
    // toLocaleDateString — so assert the label, never the formatted value.
    expect(screen.getByText(/^Created /)).toBeVisible()
    expect(screen.getByRole('button', { name: /^expand$/i })).toBeVisible()
    expect(screen.queryByRole('button', { name: /^save$/i })).toBeNull()
  })

  it('expands a card to reveal the editor, and collapses it again', async () => {
    renderPage()
    await userEvent.click(await screen.findByRole('button', { name: /^expand$/i }))

    expect(screen.getByPlaceholderText(/search products to add/i)).toBeVisible()
    expect(screen.getByText(/or paste a URL/i)).toBeVisible()
    expect(screen.getByRole('button', { name: /^save$/i })).toBeVisible()
    expect(screen.getByText(/add products above/i)).toBeVisible()

    await userEvent.click(screen.getByRole('button', { name: /^collapse$/i }))
    expect(screen.queryByRole('button', { name: /^save$/i })).toBeNull()
  })

  it('lists a bookmarked product with its price and a remove control', async () => {
    getBookmarks.mockResolvedValue({ content: [bookmark({ products: [product()] })], totalPages: 1 })
    renderPage()
    await userEvent.click(await screen.findByRole('button', { name: /^expand$/i }))

    expect(screen.getByRole('link', { name: /espresso machine/i })).toHaveAttribute('href', '/products/p1')
    // Digit-group separators, not the exact string. formatPrice pins vi-VN for VND (`1.290.000 ₫`),
    // but this assertion is the page's only coverage of getTrackedPrice -> formatPrice and it should
    // not be the thing that goes red if it is ever run against a tree without that pin, where the
    // same value is `VND 1,290,000`. The grouping is what is being characterized.
    expect(screen.getByText(/1[.,]290[.,]000/)).toBeVisible()
    expect(screen.getByText(/no image/i)).toBeVisible()
    expect(screen.getByRole('button', { name: /^remove$/i })).toBeVisible()
  })

  // The other arm of Bookmarks.jsx:369-373. Nothing has rendered it before, because every fixture
  // in this file's ancestors had images: [].
  it('renders the product thumbnail when the product has an image', async () => {
    getBookmarks.mockResolvedValue({ content: [bookmark({ products: [withImage()] })], totalPages: 1 })
    renderPage()
    await userEvent.click(await screen.findByRole('button', { name: /^expand$/i }))

    const thumb = screen.getByRole('img', { name: /espresso machine/i })
    expect(thumb).toHaveAttribute('src', 'https://images.example.test/espresso.jpg')
    expect(screen.queryByText(/no image/i)).toBeNull()
  })

  it('keeps Save disabled until the draft diverges, then saves the draft', async () => {
    updateBookmark.mockResolvedValue(bookmark({ products: [] }))
    getBookmarks.mockResolvedValue({ content: [bookmark({ products: [product()] })], totalPages: 1 })
    renderPage()
    await userEvent.click(await screen.findByRole('button', { name: /^expand$/i }))
    expect(screen.getByRole('button', { name: /^save$/i })).toBeDisabled()

    await userEvent.click(screen.getByRole('button', { name: /^remove$/i }))
    expect(screen.getByText(/unsaved changes/i)).toBeVisible()

    const save = screen.getByRole('button', { name: /^save$/i })
    expect(save).toBeEnabled()
    await userEvent.click(save)
    await waitFor(() => expect(updateBookmark).toHaveBeenCalledWith('b1', { name: 'Kitchen watch', productIds: [] }))
  })

  it('creates a bookmark from the header form', async () => {
    createBookmark.mockResolvedValue(bookmark({ id: 'b2', name: 'Monitors' }))
    renderPage()
    await userEvent.click(await screen.findByRole('button', { name: /new bookmark/i }))

    await userEvent.type(screen.getByPlaceholderText(/bookmark name/i), 'Monitors')
    await userEvent.click(screen.getByRole('button', { name: /^create$/i }))

    await waitFor(() => expect(createBookmark).toHaveBeenCalledWith({ name: 'Monitors', productIds: [] }))
    expect(await screen.findByRole('heading', { name: /monitors/i })).toBeVisible()
  })

  it('deletes a bookmark only after the confirmation dialog is accepted', async () => {
    deleteBookmark.mockResolvedValue({})
    renderPage()
    await userEvent.click(await screen.findByRole('button', { name: /^delete$/i }))

    const dialog = screen.getByRole('dialog', { hidden: true })
    expect(within(dialog).getByText(/delete this bookmark\?/i)).toBeInTheDocument()

    await userEvent.click(within(dialog).getByRole('button', { name: /^delete$/i }))
    await waitFor(() => expect(deleteBookmark).toHaveBeenCalledWith('b1'))
  })
})
