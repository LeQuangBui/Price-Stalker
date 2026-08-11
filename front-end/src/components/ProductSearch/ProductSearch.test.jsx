import { act, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import ProductSearch from './ProductSearch'
import { getProducts } from '../../api/products'

// Characterization tests, written before the CSS conversion and green against the unconverted
// component first — that order is the whole point. Queried by role, accessible name and ARIA
// attribute, never by class, so retiring the 194-line stylesheet must not require an edit here.
//
// Fake timers throughout, the same way AddByUrl.test.jsx runs its polling: the lookup sits behind
// a 400ms debounce and the dropdown closes on a 150ms blur grace, and both are asserted by
// advancing the clock rather than by waiting them out.
vi.mock('../../api/products', () => ({
  getProducts: vi.fn(),
}))

const product = (over = {}) => ({
  id: 'p1', name: 'Espresso Machine', currency: 'VND', price: 1290000,
  originalPrice: null, flashSalePrice: null, images: [], ...over,
})

const twoProducts = [product(), product({ id: 'p2', name: 'Burr Grinder' })]

function renderSearch(props = {}) {
  return render(
    <MemoryRouter>
      <ProductSearch {...props} />
    </MemoryRouter>,
  )
}

// Named, because the type <select> is a combobox too — a bare getByRole('combobox') is ambiguous
// the moment showSearchButton renders it.
const input = () => screen.getByRole('combobox', { name: 'Search products' })

// Type, close the debounce window, settle the mocked request.
async function searchFor(value) {
  fireEvent.change(input(), { target: { value } })
  await act(async () => {
    vi.advanceTimersByTime(400)
  })
  await act(async () => {})
}

describe('ProductSearch combobox', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('starts closed, wired for list autocomplete, with no active descendant', () => {
    renderSearch()
    expect(input()).toHaveAttribute('aria-expanded', 'false')
    expect(input()).toHaveAttribute('aria-autocomplete', 'list')
    expect(input()).toHaveAttribute('aria-controls')
    expect(input()).not.toHaveAttribute('aria-activedescendant')
    expect(screen.queryByRole('listbox')).toBeNull()
  })

  it('debounces the lookup and opens the listbox that aria-controls names', async () => {
    getProducts.mockResolvedValue({ content: [product()] })
    renderSearch()

    // Two keystrokes inside one debounce window collapse to a single request for the later value.
    fireEvent.change(input(), { target: { value: 'espr' } })
    fireEvent.change(input(), { target: { value: 'espresso' } })
    expect(getProducts).not.toHaveBeenCalled()

    await act(async () => {
      vi.advanceTimersByTime(400)
    })
    await act(async () => {})

    expect(getProducts).toHaveBeenCalledTimes(1)
    expect(getProducts).toHaveBeenCalledWith({ search: 'espresso', size: 6 })
    expect(input()).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('listbox').id).toBe(input().getAttribute('aria-controls'))
    expect(screen.getByRole('option', { name: /espresso machine/i })).toBeInTheDocument()
  })

  it('walks the options with the arrows and selects the active one with Enter', async () => {
    const onSelect = vi.fn()
    getProducts.mockResolvedValue({ content: twoProducts })
    renderSearch({ onSelect })
    await searchFor('machine')

    fireEvent.keyDown(input(), { key: 'ArrowDown' })
    const first = screen.getByRole('option', { name: /espresso machine/i })
    expect(input().getAttribute('aria-activedescendant')).toBe(first.id)
    expect(first).toHaveAttribute('aria-selected', 'true')

    fireEvent.keyDown(input(), { key: 'ArrowDown' })
    const second = screen.getByRole('option', { name: /burr grinder/i })
    expect(input().getAttribute('aria-activedescendant')).toBe(second.id)
    expect(first).toHaveAttribute('aria-selected', 'false')

    fireEvent.keyDown(input(), { key: 'ArrowUp' })
    expect(input().getAttribute('aria-activedescendant')).toBe(first.id)

    fireEvent.keyDown(input(), { key: 'Enter' })
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: 'p1' }))
    expect(input()).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('listbox')).toBeNull()
  })

  // The first lookup gives no in-flight feedback at all — the dropdown only opens when a response
  // lands, and the status line lives inside it. "Searching..." is therefore only ever visible on a
  // FOLLOW-UP lookup, over the previous results, and that is what this pins.
  it('reads Searching... over the stale results while a follow-up lookup is in flight', async () => {
    getProducts.mockResolvedValue({ content: [product()] })
    renderSearch()
    await searchFor('espresso')
    expect(screen.queryByText('Searching...')).toBeNull()

    getProducts.mockReturnValue(new Promise(() => {}))
    fireEvent.change(input(), { target: { value: 'espresso ma' } })
    await act(async () => {
      vi.advanceTimersByTime(400)
    })

    expect(screen.getByText('Searching...')).toBeInTheDocument()
    expect(screen.getByRole('option', { name: /espresso machine/i })).toBeInTheDocument()
  })

  it('opens to report a failed lookup, with no options to offer', async () => {
    getProducts.mockRejectedValue(new Error('boom'))
    renderSearch()
    await searchFor('espresso')

    expect(input()).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByText('Search failed. Try again.')).toBeInTheDocument()
    expect(screen.queryByRole('option')).toBeNull()
  })

  it('says so when the lookup comes back empty', async () => {
    getProducts.mockResolvedValue({ content: [] })
    renderSearch()
    await searchFor('nothing tracked')

    expect(input()).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByText('No results found')).toBeInTheDocument()
  })

  // Selection rides mouse-DOWN, which is what lets it land inside the input's 150ms blur grace.
  it('marks the hovered option active and selects it on mouse-down', async () => {
    const onSelect = vi.fn()
    getProducts.mockResolvedValue({ content: [product()] })
    renderSearch({ onSelect })
    await searchFor('espresso')

    const option = screen.getByRole('option', { name: /espresso machine/i })
    fireEvent.mouseEnter(option)
    expect(input().getAttribute('aria-activedescendant')).toBe(option.id)

    fireEvent.mouseDown(option)
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: 'p1' }))
    expect(screen.queryByRole('listbox')).toBeNull()
  })

  it('adds from the row button exactly once, and disables it for a product already added', async () => {
    const onSelect = vi.fn()
    getProducts.mockResolvedValue({ content: twoProducts })
    renderSearch({ onSelect, existingIds: ['p2'] })
    await searchFor('machine')

    expect(screen.getByRole('button', { name: 'Added' })).toBeDisabled()

    // stopPropagation on the button keeps the row's own mouse-down handler out of it.
    fireEvent.mouseDown(screen.getByRole('button', { name: '+ Add' }))
    expect(onSelect).toHaveBeenCalledTimes(1)
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: 'p1' }))
  })

  it('holds the dropdown through the 150ms blur grace, then closes it', async () => {
    getProducts.mockResolvedValue({ content: [product()] })
    renderSearch()
    await searchFor('espresso')

    fireEvent.blur(input())
    expect(input()).toHaveAttribute('aria-expanded', 'true')

    act(() => {
      vi.advanceTimersByTime(150)
    })
    expect(input()).toHaveAttribute('aria-expanded', 'false')
  })

  it('closes on Escape and reopens on focus while results are still held', async () => {
    getProducts.mockResolvedValue({ content: [product()] })
    renderSearch()
    await searchFor('espresso')

    fireEvent.keyDown(input(), { key: 'Escape' })
    expect(input()).toHaveAttribute('aria-expanded', 'false')

    fireEvent.focus(input())
    expect(input()).toHaveAttribute('aria-expanded', 'true')
  })

  it('empties and closes the moment the query is cleared, with no request', async () => {
    getProducts.mockResolvedValue({ content: [product()] })
    renderSearch()
    await searchFor('espresso')
    expect(getProducts).toHaveBeenCalledTimes(1)

    fireEvent.change(input(), { target: { value: '' } })
    expect(input()).toHaveAttribute('aria-expanded', 'false')

    await act(async () => {
      vi.advanceTimersByTime(400)
    })
    expect(getProducts).toHaveBeenCalledTimes(1)
  })

  // The Home flow: no onSelect, a type <select> and a Search button beside the input.
  it('hands the typed query to onSearch on Enter and on the button, empty query as {}', () => {
    const onSearch = vi.fn()
    renderSearch({ onSearch, showSearchButton: true })

    fireEvent.click(screen.getByRole('button', { name: 'Search' }))
    expect(onSearch).toHaveBeenCalledWith({})

    fireEvent.change(input(), { target: { value: 'mouse' } })
    fireEvent.keyDown(input(), { key: 'Enter' })
    expect(onSearch).toHaveBeenLastCalledWith({ search: 'mouse' })

    fireEvent.click(screen.getByRole('button', { name: 'Search' }))
    expect(onSearch).toHaveBeenLastCalledWith({ search: 'mouse' })
    expect(onSearch).toHaveBeenCalledTimes(3)
  })

  it('routes the query through the chosen search type', () => {
    const onSearch = vi.fn()
    renderSearch({ onSearch, showSearchButton: true })

    fireEvent.change(screen.getByRole('combobox', { name: 'Search by' }), {
      target: { value: 'url' },
    })
    fireEvent.change(input(), { target: { value: 'https://gearvn.com/products/mouse' } })
    fireEvent.click(screen.getByRole('button', { name: 'Search' }))
    expect(onSearch).toHaveBeenCalledWith({ url: 'https://gearvn.com/products/mouse' })
  })
})
