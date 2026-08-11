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

// Exact class tokens. `toContain` on the raw string would let a responsive `…:flex-row` variant
// satisfy a check for bare `flex-row`, which is the one confusion these assertions exist to catch.
//
// The variant is described rather than spelled out, and that is not fussiness. Tailwind v4 scans
// source files as plain TEXT and does not parse them, so it cannot tell a class name in a comment
// from one on an element: writing the literal here put a real, dead
// `@media (min-width:26.25rem){.min-\[26\.25rem\]\:flex-row{flex-direction:row}}` into the
// production bundle with no carrier anywhere in the tree. Worse, it would make any later
// `grep min-width:26.25rem` on the build pass whether or not the page still used the step.
const classesOf = (el) => el.className.split(/\s+/)

describe('Alerts page markup after the CSS retirement', () => {
  beforeEach(() => {
    getAlerts.mockResolvedValue({ content: [alert()], totalPages: 1 })
  })

  it('carries no class owned by the retired stylesheet', async () => {
    const { container } = renderPage()
    await screen.findByRole('link', { name: /espresso machine/i })

    for (const cls of [
      // the twelve live names this commit spends
      'alerts-list', 'alert-card', 'alert-card-main', 'alert-card-controls', 'alert-card-actions',
      'alert-card-skeleton', 'alert-action-button', 'alert-checkbox', 'alert-field',
      'alert-product-link', 'alert-product-meta', 'alerts-state',
      // the four that were already dead in the CSS and never had a carrier
      'alerts-page', 'alerts-header', 'alerts-subtitle', 'alerts-home-link',
    ]) {
      expect(container.querySelector(`.${cls}`), `${cls} should be gone`).toBeNull()
    }
  })

  // The 511px-off-screen Retry. `.page-error` carries `overflow-wrap: anywhere`, which is the only
  // value that feeds break opportunities into intrinsic sizing, and `role="alert"`, which the
  // hand-rolled box never had.
  it('draws the error box with the shared primitive, announced and breakable', async () => {
    getAlerts.mockRejectedValue(new Error('Failed to load https://x.test/pdp/get_pc?item_id=1&bundle_deal_id=0'))
    const { container } = renderPage()
    const box = await screen.findByRole('alert')
    expect(classesOf(box)).toContain('page-error')
    expect(within(box).getByRole('button', { name: /retry/i })).toBeVisible()
    expect(container.querySelector('.alerts-state')).toBeNull()
  })

  // Wait for the empty BRANCH before querying `status`, not for the role itself. The page's own
  // loading announcement (`<p className="sr-only" role="status">`) is the first thing that paints,
  // so `findByRole('status')` resolves against it on tick zero and never sees the panel — measured:
  // one `status` at first paint carrying `sr-only`, one after the fetch resolves carrying
  // `empty-state`. The two never coexist, because `loading` is false by the time the panel renders,
  // so once the heading is on screen `getByRole('status')` is unambiguous.
  it('draws the empty state with the shared primitive, announced', async () => {
    getAlerts.mockResolvedValue({ content: [], totalPages: 0 })
    renderPage()
    await screen.findByRole('heading', { name: /no price alerts yet/i })
    const panel = screen.getByRole('status')
    expect(classesOf(panel)).toContain('empty-state')
    expect(within(panel).getByRole('heading', { name: /no price alerts yet/i })).toBeVisible()
  })

  // .btn is the only thing in the tree that carries min-height: 44px, and it is also what gives
  // Save and Delete the same border box — they differ by 2px today because only the danger variant
  // has a border.
  it('puts both card controls on the button primitive', async () => {
    renderPage()
    await screen.findByRole('link', { name: /espresso machine/i })
    for (const name of [/^save$/i, /^delete$/i]) {
      expect(classesOf(screen.getByRole('button', { name })), `${name} is not on .btn`).toContain('btn')
    }
    expect(classesOf(screen.getByRole('button', { name: /^delete$/i }))).toContain('btn-danger')
  })

  // The threshold control inherited 14px from its wrapping label through index.css's
  // `font: inherit` reset, with no rule naming the control — invisible to input-zoom.guard both
  // before and after. Field's input is the only thing that puts an explicit size on it. The focus
  // ring is the other half: index.css's :focus-visible rule does not cover a bare input, so without
  // these three utilities the field has no visible focus state at all.
  it('keeps the threshold input over the iOS floor and gives it a focus ring', async () => {
    renderPage()
    const input = await screen.findByRole('spinbutton')
    expect(classesOf(input)).toContain('text-base')
    for (const utility of ['focus:border-oxblood', 'focus:ring-2', 'focus:ring-oxblood/20']) {
      expect(classesOf(input), `${utility} missing — the focus ring left with the class`).toContain(utility)
    }
    expect(input.id).toBe('threshold-a1')
    expect(input.labels[0]).toHaveTextContent(/threshold/i)
  })

  it('keeps the 44px floor on the Active toggle', async () => {
    renderPage()
    const box = await screen.findByRole('checkbox')
    expect(classesOf(box.closest('label'))).toContain('min-h-11')
  })

  // The stack fired at 768px, roughly 400px early. What replaces it is a rem step, and this test
  // asserts the SHAPE — a rem-gated pair, never `md:`, never px — not the number, because Task 7
  // measures the number and may legitimately find that no breakpoint is needed at all. If it does,
  // delete this test in that commit rather than weakening it.
  it('stacks the card on a rem step rather than md:', async () => {
    const { container } = renderPage()
    await screen.findByRole('link', { name: /espresso machine/i })
    // The card's first child div is the row; querying by class would defeat the point.
    const row = container.querySelector('section > div')
    const classes = classesOf(row)
    expect(classes).toContain('flex-col')
    expect(classes.some((c) => /^min-\[[\d.]+rem\]:flex-row$/.test(c)), row.className).toBe(true)
    expect(classes).not.toContain('md:flex-row')
    expect(row.className).not.toMatch(/min-\[\d+px\]/)
  })

  // C10. Both halves are required and neither implies the other: `flex-wrap` on the row is what
  // permits a second line, and a non-zero flex-basis on the field is what ever produces one. The
  // 180px min-width and the 192px UA `size` default that used to do that job both leave with the
  // stylesheet, and `flex-1` would replace them with a hypothetical size of 0 — an item that can
  // never overflow a line, so the toggle would be squeezed beside the field forever instead of
  // dropping under it. Neither the row nor the field is individually over width.guard's 320px
  // floor, and `basis-[11rem]` is rem, so nothing in the suite would say a word.
  it('keeps the controls row wrapping, with a field that can both break and shrink', async () => {
    renderPage()
    const input = await screen.findByRole('spinbutton')
    const field = input.closest('div')
    const controls = field.parentElement
    expect(classesOf(controls)).toContain('flex-wrap')
    for (const utility of ['basis-[11rem]', 'grow', 'min-w-0']) {
      expect(classesOf(field), `${utility} missing — the toggle will stop wrapping`).toContain(utility)
    }
    expect(classesOf(field), 'flex-1 zeroes the hypothetical size and kills the wrap')
      .not.toContain('flex-1')
  })

  // C13. The row is a row from ~420px after this conversion, not from 768px, so a marketplace title
  // carrying one long model string is now what sets the card's floor. `min-w-0` on the column is
  // what lets it be narrower than that string; `wrap-anywhere` is what gives the string a break
  // opportunity that intrinsic sizing can actually see. `break-words` is defined not to.
  it('lets a long product name break rather than setting the card floor', async () => {
    getAlerts.mockResolvedValue({
      content: [alert({ product: { ...product(), name: 'De Longhi ECP33.21-1100W-BLACK' } })],
      totalPages: 1,
    })
    const { container } = renderPage()
    const link = await screen.findByRole('link', { name: /ecp33/i })
    expect(classesOf(link)).toContain('wrap-anywhere')
    expect(classesOf(link)).not.toContain('break-words')
    expect(classesOf(container.querySelector('section > div > div'))).toContain('min-w-0')
  })
})
