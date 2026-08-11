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

// Exact class tokens — `toContain` on the raw string would let `min-w-full` satisfy a check for
// `w-full`, and `rounded-2xl` a check for `rounded-xl`.
const classesOf = (el) => el.className.split(/\s+/)

describe('ProductDetail markup after the CSS retirement', () => {
  beforeEach(() => {
    getProduct.mockResolvedValue(product({ images: threeImages }))
    findAlertForProduct.mockResolvedValue({ id: 'al1', thresholdPrice: 990000, active: true })
  })

  it('carries no class owned by the retired stylesheet', async () => {
    const { container } = renderPage({ isSignedIn: true })
    await screen.findByRole('heading', { name: /espresso machine/i })

    for (const cls of [
      // the twenty-four live names this commit spends
      'swiper', 'swiper-track', 'swiper-slide', 'swiper-btn', 'swiper-prev', 'swiper-next',
      'swiper-dots', 'swiper-dot', 'product-panel', 'product-panel-header', 'compact',
      'alert-status', 'paused', 'alert-form', 'panel-label', 'panel-hint', 'panel-input',
      'checkbox-row', 'alert-actions', 'panel-button', 'secondary', 'panel-message',
      'error-message', 'panel-text',
      // the thirteen that were already dead in the CSS and never had a carrier
      'product-detail-container', 'back-link', 'product-detail', 'product-images', 'product-sku',
      'price-flash', 'price-amount', 'price-struck', 'price-original', 'product-meta', 'meta-item',
      'meta-label', 'view-product-btn',
    ]) {
      expect(container.querySelector(`.${cls}`), `${cls} should be gone`).toBeNull()
    }
  })

  // Q1. The frame's four utilities were all written by the author and all four were losing to an
  // unlayered rule: `rounded-2xl` computed to 8px and `bg-paper` to var(--bg-tertiary). The
  // decision was to keep the pixels, so the utilities change to say what the page has always
  // drawn. This is the one assertion in the file that pins an appearance rather than a behaviour.
  //
  // The radius is asserted as the TOKEN, and `rounded-lg` is asserted absent, because `rounded-lg`
  // is the plausible-looking wrong answer: index.css's unlayered :root sets `--radius-lg: 12px`,
  // shadowing Tailwind's own `.5rem`, so `rounded-lg` is 12px at every root and there is no named
  // step that means 8px.
  it('keeps the gallery frame at 8px on the tertiary backdrop', async () => {
    const { container } = renderPage()
    await screen.findByRole('button', { name: /next image/i })
    const frame = track(container).parentElement
    const classes = classesOf(frame)
    for (const utility of [
      'relative', 'aspect-square', 'overflow-hidden', 'rounded-[var(--radius)]', 'bg-tertiary',
    ]) {
      expect(classes, `${utility} missing`).toContain(utility)
    }
    expect(classes, 'rounded-lg is 12px, not 8px').not.toContain('rounded-lg')
    expect(classes).not.toContain('rounded-2xl')
    expect(classes).not.toContain('bg-paper')
  })

  // The paging is an inline transform and this declaration is the only thing that animates it.
  // `transition-colors` would leave the gallery jumping between slides with nothing to say so.
  it('keeps the transform transition that is the gallery\'s only animation', async () => {
    const { container } = renderPage()
    await screen.findByRole('button', { name: /next image/i })
    const classes = classesOf(track(container))
    expect(classes).toContain('transition-transform')
    expect(classes).toContain('duration-[400ms]')
    // The easing is not optional and nothing else would catch its absence. `.transition-transform`
    // sets `transition-timing-function: var(--tw-ease, var(--default-transition-timing-function))`
    // and the default is cubic-bezier(.4,0,.2,1) — verified in a compile this session — so dropping
    // `ease-[ease]` silently swaps the curve the gallery has always used for a different one, with
    // the same duration and the same property. Nothing on screen says so.
    // Asserted as "the only easing token is this one" rather than by naming the wrong curve.
    // Naming one would be weaker — it catches a single substitution out of the dozen easings
    // Tailwind ships — and it would also emit that easing as a live rule into the bundle for
    // nothing, because Tailwind scans this file as plain text and does not care that the token
    // sits inside an assertion that it is absent. Checked in a build: it did exactly that.
    expect(classes.filter((c) => c.startsWith('ease-')), 'exactly one easing, the `ease` keyword')
      .toEqual(['ease-[ease]'])
    expect(classes, 'ease-[ease] missing — the curve silently becomes cubic-bezier(.4,0,.2,1)')
      .toContain('ease-[ease]')
    expect(classes).not.toContain('transition-colors')
    // The track is taken out of flow so its height never has to resolve against the frame's
    // aspect-ratio. Drop `inset-0` and `h-full` resolves against auto and the frame collapses.
    expect(classes).toContain('absolute')
    expect(classes).toContain('inset-0')
  })

  it('keeps each slide a full frame wide and each image covering it', async () => {
    const { container } = renderPage()
    const img = await screen.findByRole('img', { name: /espresso machine 1/i })
    expect(classesOf(img.parentElement)).toContain('min-w-full')
    for (const utility of ['h-full', 'w-full', 'object-cover']) {
      expect(classesOf(img), `${utility} missing`).toContain(utility)
    }
    expect(container).toBeTruthy()
  })

  // Tailwind v4's preflight sets no button cursor — verified in the built bundle, which contains
  // no framework-level cursor rule at all — and neither of these adopts `.btn`. This project has
  // already lost `cursor: pointer` in a conversion.
  it('gives the gallery controls the 44px floor, the scrim and an explicit pointer', async () => {
    renderPage()
    const arrow = await screen.findByRole('button', { name: /next image/i })
    for (const utility of ['size-11', 'cursor-pointer', 'bg-scrim']) {
      expect(classesOf(arrow), `${utility} missing`).toContain(utility)
    }

    const dot = screen.getByRole('button', { name: 'Go to image 2' })
    expect(classesOf(dot)).toContain('size-11')
    expect(classesOf(dot)).toContain('cursor-pointer')
    // The painted core is a real child element rather than a pseudo-element, so the 44px hit box
    // and the 10px circle are independent and adjacent boxes no longer overlap.
    expect(classesOf(dot.firstChild)).toContain('size-2.5')
  })

  // C14, and it is the one thing in this file that jsdom can check about a defect that only exists
  // in a laid-out browser. `inset-x-0 bottom-0` makes the rail a full-bleed transparent band at
  // least 44px deep, later in DOM order than both arrows and at the same z-index: auto, so at a
  // raised root with a wrapped rail it takes every tap meant for an arrow. The rail has no handler
  // of its own — every onClick is on a dot — so these two utilities cost nothing.
  //
  // Task 9's elementFromPoint sweep is what actually proves it. This pins the mechanism so a later
  // edit cannot quietly remove it and still pass the suite.
  it('lets taps through the dot rail to the arrows underneath', async () => {
    renderPage()
    const dot = await screen.findByRole('button', { name: 'Go to image 2' })
    const rail = dot.parentElement
    expect(classesOf(rail), 'the rail is a full-bleed band over both arrows without this')
      .toContain('pointer-events-none')
    expect(classesOf(dot), 'a rail with pointer-events-none makes its own dots untappable too')
      .toContain('pointer-events-auto')
  })

  it('marks the current dot on the core, not the hit box', async () => {
    renderPage()
    await screen.findByRole('button', { name: 'Go to image 1' })
    expect(classesOf(screen.getByRole('button', { name: 'Go to image 1' }).firstChild))
      .toContain('bg-oxblood')
    expect(classesOf(screen.getByRole('button', { name: 'Go to image 2' }).firstChild))
      .not.toContain('bg-oxblood')
  })

  // The input declared 15px and the guard's allowlist entry for it leaves in this commit. Field's
  // input is where the replacement size lives, and its focus: variants are the only focus state
  // this control has — index.css:252-257 covers a, button and [role="button"], not input.
  it('keeps the threshold input over the iOS floor and gives it a focus ring', async () => {
    renderPage({ isSignedIn: true })
    const input = await screen.findByLabelText(/threshold price/i)
    expect(classesOf(input)).toContain('text-base')
    for (const utility of ['focus:border-oxblood', 'focus:ring-2', 'focus:ring-oxblood/20']) {
      expect(classesOf(input), `${utility} missing — the focus ring left with the class`).toContain(utility)
    }
    expect(input.id).toBe('threshold-price')
  })

  // Q3. Field renders its hint AFTER the input; "Current price" is the context a reader needs in
  // order to choose a threshold, so it stays before the control as its own element rather than
  // moving into the hint slot.
  it('keeps the current price before the control a reader is about to fill in', async () => {
    renderPage({ isSignedIn: true })
    const input = await screen.findByLabelText(/threshold price/i)
    const hint = screen.getByText(/current price:/i)
    expect(hint.compareDocumentPosition(input) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(classesOf(hint)).toContain('text-sm')
  })

  it('puts the pause toggle on the shared checkbox primitive', async () => {
    renderPage({ isSignedIn: true })
    const box = await screen.findByRole('checkbox')
    expect(classesOf(box.closest('label'))).toContain('min-h-11')
  })

  it('puts both alert controls on the button primitive', async () => {
    renderPage({ isSignedIn: true })
    const submit = await screen.findByRole('button', { name: /update alert/i })
    expect(classesOf(submit)).toContain('btn')
    const remove = screen.getByRole('button', { name: /delete alert/i })
    expect(classesOf(remove)).toContain('btn')
    expect(classesOf(remove)).toContain('btn-danger')
  })

  // A bare <h2> is 16px — preflight sets heading font-size to inherit — so the size is mandatory.
  // The margin is not: the alert panel's heading is a flex item beside the status pill, and a
  // bottom margin there both mis-centres it (flex centres the margin box) and stacks with the
  // header's own, giving 32px of gap where the other two panels have 16.
  it('sizes every panel heading and only gives a margin to the standalone ones', async () => {
    renderPage({ isSignedIn: true })
    const alertTitle = await screen.findByRole('heading', { name: /price alert/i })
    expect(classesOf(alertTitle)).toContain('text-xl')
    expect(classesOf(alertTitle)).not.toContain('mb-4')

    const notes = screen.getByRole('heading', { name: /tracking notes/i })
    expect(classesOf(notes)).toContain('text-xl')
    expect(classesOf(notes)).toContain('mb-4')
  })

  // Adopting Field changes the control's box as well as its type, and both changes are intended.
  // Pinned so a reviewer reading the screenshots has something to check them against rather than
  // reporting them as conversion errors: 6px corners become 12px, and 12/14 padding becomes 12/16.
  it('accepts Field\'s own box on the threshold control', async () => {
    renderPage({ isSignedIn: true })
    const input = await screen.findByLabelText(/threshold price/i)
    for (const utility of ['rounded-xl', 'px-4', 'py-3']) {
      expect(classesOf(input), `${utility} — Field's own box`).toContain(utility)
    }
  })
})
