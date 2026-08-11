import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import AddToBookmark from './AddToBookmark'
import { createBookmark, getBookmarks, updateBookmark } from '../../api/bookmarks'

// Characterization tests, written before the CSS conversion and green against the unconverted
// component first — that order is the whole point. Queried by role, accessible name and label,
// never by class, so retiring the 160-line stylesheet must not require an edit here.
vi.mock('../../api/bookmarks', () => ({
  getBookmarks: vi.fn(),
  createBookmark: vi.fn(),
  updateBookmark: vi.fn(),
}))

const bookmark = (over = {}) => ({ id: 'b1', name: 'Kitchen watch', products: [], ...over })

const openDropdown = async () => {
  await userEvent.click(screen.getByRole('button', { name: 'Save to Bookmark' }))
  await screen.findByText('Existing bookmarks')
}

describe('AddToBookmark dropdown', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getBookmarks.mockResolvedValue({ content: [bookmark()] })
  })

  it('opens on the trigger, fetches once, and lists every bookmark with its count', async () => {
    getBookmarks.mockResolvedValue({
      content: [bookmark(), bookmark({ id: 'b2', name: 'Gifts', products: [{ id: 'p9' }] })],
    })
    render(<AddToBookmark productId="p1" />)
    expect(screen.queryByText('Choose a bookmark')).toBeNull()
    expect(getBookmarks).not.toHaveBeenCalled()

    await openDropdown()
    expect(getBookmarks).toHaveBeenCalledWith({ size: 100 })
    expect(screen.getByText('Kitchen watch')).toBeInTheDocument()
    expect(screen.getByText('0 products')).toBeInTheDocument()
    expect(screen.getByText('Gifts')).toBeInTheDocument()
    expect(screen.getByText('1 products')).toBeInTheDocument()
  })

  it('reads Loading... while the list is on the wire', async () => {
    getBookmarks.mockReturnValue(new Promise(() => {}))
    render(<AddToBookmark productId="p1" />)
    await userEvent.click(screen.getByRole('button', { name: 'Save to Bookmark' }))

    expect(screen.getByText('Loading...')).toBeInTheDocument()
    expect(screen.queryByText('Existing bookmarks')).toBeNull()
  })

  it('surfaces a failed fetch by its message', async () => {
    getBookmarks.mockRejectedValue(new Error('Internal Server Error'))
    render(<AddToBookmark productId="p1" />)
    await userEvent.click(screen.getByRole('button', { name: 'Save to Bookmark' }))

    expect(await screen.findByText('Internal Server Error')).toBeInTheDocument()
  })

  it('points an empty list at the create form below', async () => {
    getBookmarks.mockResolvedValue({ content: [] })
    render(<AddToBookmark productId="p1" />)
    await openDropdown()

    expect(screen.getByText('No bookmarks yet. Create one below.')).toBeInTheDocument()
    expect(screen.getByLabelText('Create a new bookmark')).toBeInTheDocument()
  })

  it('adds the product to an existing bookmark, confirms by name, and pins the row as Added', async () => {
    getBookmarks.mockResolvedValue({ content: [bookmark({ products: [{ id: 'p7' }] })] })
    updateBookmark.mockResolvedValue({
      id: 'b1', name: 'Kitchen watch', products: [{ id: 'p7' }, { id: 'p1' }],
    })
    render(<AddToBookmark productId="p1" />)
    await openDropdown()

    await userEvent.click(screen.getByRole('button', { name: 'Add' }))
    await waitFor(() => expect(updateBookmark).toHaveBeenCalledWith('b1', {
      name: 'Kitchen watch',
      productIds: ['p7', 'p1'],
    }))
    expect(await screen.findByText('Saved to "Kitchen watch".')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Added' })).toBeDisabled()
  })

  it('reads Saving... on the row while the update is in flight', async () => {
    updateBookmark.mockReturnValue(new Promise(() => {}))
    render(<AddToBookmark productId="p1" />)
    await openDropdown()

    await userEvent.click(screen.getByRole('button', { name: 'Add' }))
    expect(await screen.findByRole('button', { name: 'Saving...' })).toBeDisabled()
  })

  it('disables the row action when the bookmark already holds this product', async () => {
    getBookmarks.mockResolvedValue({ content: [bookmark({ products: [{ id: 'p1' }] })] })
    render(<AddToBookmark productId="p1" />)
    await openDropdown()

    expect(screen.getByRole('button', { name: 'Added' })).toBeDisabled()
    expect(updateBookmark).not.toHaveBeenCalled()
  })

  it('surfaces an update failure and leaves the row actionable', async () => {
    updateBookmark.mockRejectedValue(new Error('Failed to update bookmark'))
    render(<AddToBookmark productId="p1" />)
    await openDropdown()

    await userEvent.click(screen.getByRole('button', { name: 'Add' }))
    expect(await screen.findByText('Failed to update bookmark')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add' })).toBeEnabled()
  })

  it('creates a bookmark holding this product and lists it, cleared and confirmed', async () => {
    createBookmark.mockResolvedValue({ id: 'b2', name: 'Wishlist', products: [{ id: 'p1' }] })
    render(<AddToBookmark productId="p1" />)
    await openDropdown()

    await userEvent.type(screen.getByLabelText('Create a new bookmark'), 'Wishlist')
    await userEvent.click(screen.getByRole('button', { name: 'Create and Save' }))
    await waitFor(() => expect(createBookmark).toHaveBeenCalledWith({
      name: 'Wishlist',
      productIds: ['p1'],
    }))
    expect(await screen.findByText('Saved to new bookmark "Wishlist".')).toBeInTheDocument()
    expect(screen.getByLabelText('Create a new bookmark')).toHaveValue('')
    // The new bookmark joins the existing list, already holding the product.
    expect(screen.getByText('Wishlist')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Added' })).toBeDisabled()
  })

  it('refuses to create without a name', async () => {
    render(<AddToBookmark productId="p1" />)
    await openDropdown()

    await userEvent.click(screen.getByRole('button', { name: 'Create and Save' }))
    expect(await screen.findByText('Bookmark name is required')).toBeInTheDocument()
    expect(createBookmark).not.toHaveBeenCalled()
  })

  it('surfaces a create failure by its message', async () => {
    createBookmark.mockRejectedValue(new Error('Failed to create bookmark'))
    render(<AddToBookmark productId="p1" />)
    await openDropdown()

    await userEvent.type(screen.getByLabelText('Create a new bookmark'), 'Wishlist')
    await userEvent.click(screen.getByRole('button', { name: 'Create and Save' }))
    expect(await screen.findByText('Failed to create bookmark')).toBeInTheDocument()
  })

  it('closes on a press anywhere outside', async () => {
    render(
      <div>
        <AddToBookmark productId="p1" />
        <button type="button">elsewhere</button>
      </div>,
    )
    await openDropdown()

    await userEvent.click(screen.getByRole('button', { name: 'elsewhere' }))
    expect(screen.queryByText('Choose a bookmark')).toBeNull()
  })
})
