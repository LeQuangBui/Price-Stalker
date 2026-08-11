import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { createAlert, deleteAlert, findAlertForProduct, updateAlert } from '../../api/alerts'
import { isUnauthorizedError } from '../../api/auth'
import { getProduct } from '../../api/products'
import AddToBookmark from '../../components/AddToBookmark/AddToBookmark'
import PriceHistoryChart from '../../components/PriceHistoryChart/PriceHistoryChart'
import { useConfirm } from '../../components/ConfirmDialog/useConfirm'
import AppLink from '../../components/AppLink'
import { useToast } from '../../components/Toast/ToastProvider'
import Kicker from '../../components/primitives/Kicker'
import SectionHeader from '../../components/primitives/SectionHeader'
import PriceDisplay from '../../components/primitives/PriceDisplay'
import DropBadge from '../../components/primitives/DropBadge'
import ErrorState from '../../components/primitives/ErrorState'
import CheckboxRow from '../../components/primitives/CheckboxRow'
import Field from '../../components/primitives/Field'
import { cx } from '../../lib/cx'
import {
  formatDate,
  formatDateTime,
  formatPrice,
  getTrackedPrice,
  hasFlashSalePrice,
  hasOriginalPrice
} from '../../utils/formatters'

// The gallery arrows. `size-11` is the 44px floor — they measured 40x40 with no padding, live on
// every product with two or more images. `cursor-pointer` is not decoration: verified in the built
// bundle, Tailwind v4's preflight sets no button cursor at all, so a <button> that does not adopt
// `.btn` gets the UA arrow. `bg-scrim` is the token minted for this one value; the literal it
// replaces was hard-coded slate-900, identical in both themes and invisible to tokens.guard, and so
// is every default-palette slash-opacity replacement for it — those emit hex into the generated
// stylesheet and never into src/, and none of them flips with the theme. Note that the obvious such
// spelling is NOT written out here even as an example: Tailwind scans this file as plain text, so a
// class name inside a comment compiles to a real rule. Writing it would have shipped a dead
// hard-coded black into the bundle from the comment arguing against hard-coded colour.
//
// ONE template literal, not two concatenated strings and not an array join. classname.guard's
// AT_CONSTANT is /^\s*(?:export\s+)?const\s+[A-Z][A-Z0-9_]*\s*=\s*(?:'([^']*)'|`([^`]*)`)/gm — it
// captures the FIRST literal after the `=` and nothing else, so `'a' + 'b'` hides `b` from both
// tests and `['a','b'].join(' ')` hides everything. `bg-scrim` and `text-white` are in the half
// that would have been invisible.
const SWIPER_BTN = `absolute top-1/2 grid size-11 -translate-y-1/2 cursor-pointer place-items-center rounded-full border-0 bg-scrim text-xl text-white`

// The dot rail. Each dot is a 44x44 hit box around a 10px painted core, with no gap, so adjacent
// boxes are adjacent rather than overlapping. They overlapped by 12px before — 30x30 boxes on an
// 18px pitch, both at `z-index: auto` in one stacking context, so the later dot in DOM order took
// the whole overlap and the right 2px of the dot you were aiming at opened the NEXT slide.
// Measured exclusive tap width was 18px for dots 1-4 and 30px for dot 5.
//
// STATIC, and a SIBLING BELOW the frame rather than absolutely positioned inside it. That is the
// whole fix, and it is the third attempt at this bug. The first two both left the rail overlaying
// the frame and then arbitrated the shared pixels — `pointer-events-none` on the band, then DOM
// order so the arrows paint last — and each time the arbitration protected the thing it was
// written to protect and cost something that had not been measured. Measured on the second one,
// with a full-AREA sweep of the PAINTED CORE rather than of the 44px hit box, at five images:
//
//     305/root 20   dot 1: 0 of 121 px its own (BUTTON[Previous image])   dot 3: 0 of 121 (Next)
//     305/root 24   dot 1: 0 of 196 (Previous)                            dot 3: 0 of 196 (Next)
//     320/root 24   dot 1: 0 of 196 (Previous)                            dot 3: 0 of 196 (Next)
//     360/root 24   dot 1: 0 of 196 (Previous)                            dot 3: 0 of 196 (Next)
//
// Confirmed with real trusted clicks over `Input.dispatchMouseEvent` — not `.click()`, which
// bypasses hit testing and reports success on a control buried under another: tapping the visible
// centre of dot 1 moved the gallery to slide 4, and dot 3 to slide 1. The hit box losing pixels was
// the signed-off cost; the painted core losing 100% of them is what a reader actually aims at, and
// nobody had measured it because the earlier probe swept one horizontal line through each box.
//
// Out of flow, the rail and the arrows shared pixels no matter who was given them, so the geometry
// had no solution on a small frame: two 66px arrows and a 66px-deep rail line do not both fit in
// the 188px an aspect-square frame has at 305px/root 24, and horizontal padding wide enough to
// clear the arrows (3.5rem a side, 168 of 188px) leaves less than one dot of interior. In flow,
// there are no shared pixels to arbitrate: the rail wraps as freely as it likes, the frame keeps
// its full height for the arrows, and both control sets hold 44px at every root. The frame keeps
// `relative` and `aspect-square` because the arrows still position against it.
//
// The colour of an inactive dot had to change with the position, and that is the one thing this
// move costs. `--bg-primary` at 72% was picked to read over a PHOTOGRAPH; over the page it is
// white-on-near-white and simply disappears. Contrast against `--bg-secondary`, measured in both
// themes, against the 3:1 floor a non-text indicator has to clear:
//
//     --bg-primary at 72% (retired)  1.07 light  1.08 dark      --border          1.18  1.42
//     --text-muted at 55%            2.05        2.56           --bg-tertiary     1.09  1.25
//     --text-muted solid             4.35        5.50   <- `bg-ink-mute`
//
// So it is the solid token: every faint spelling of "an inactive dot" fails, including the two
// border/surface tokens that look like the obvious choice. `bg-oxblood` stays for the current dot
// and clears the floor on its own, at 10.11 light and 4.05 dark.
//
// Do NOT put this back inside the frame. `pointer-events`, DOM order, a constrained width and a
// z-index are all arbitration, the last of which has already shipped once here and made a nav
// untappable. There is nothing to arbitrate while the two live in different boxes.
const SWIPER_DOTS = 'flex flex-wrap items-center justify-center'
const SWIPER_DOT = 'grid size-11 cursor-pointer place-items-center border-0 bg-transparent p-0'

const PANEL = 'rounded-2xl border border-line bg-surface p-6 shadow-[var(--shadow-sm)]'
const PANEL_COMPACT = 'rounded-2xl border border-line bg-surface px-6 py-5 shadow-[var(--shadow-sm)]'

// 20px, down from the retired 22px, which is not a rem step. An explicit size is MANDATORY here,
// not cosmetic: Tailwind's preflight sets heading font-size to inherit and index.css:159-167
// overrides only family, weight, tracking and leading, so a bare <h2> is 16px.
//
// No bottom margin. The retired rule's `margin: 0 0 16px 0` applied to all three headings, and on
// the alert panel that heading is a flex item beside the status pill: flex centres the MARGIN box,
// so the text sat about 8px above the pill's centre line, and the margin stacked with the header's
// own to give 32px of gap where the other two panels have 16. The two standalone headings add
// `mb-4` at their call sites.
const PANEL_TITLE = 'text-xl'

// The status pill. 13px is not a rem step and this is a compact badge, so `text-xs`. The 30px box
// is written in rem for the same reason the type is: at a 24px browser default the label is 18px,
// and a frozen px box around growing text is the clipping bug this phase exists to remove.
const ALERT_STATUS = 'inline-flex min-h-7.5 items-center rounded-full px-3 text-xs font-bold'
// Tailwind's slash-opacity emits color-mix(in OKLAB, ...), which is not what these were, so the
// two tints keep the srgb mix verbatim. Underscores for the spaces — precedent at Pagination.jsx:9.
const ALERT_STATUS_ACTIVE =
  'bg-[color-mix(in_srgb,var(--success)_14%,transparent)] text-success-deep'
const ALERT_STATUS_PAUSED =
  'bg-[color-mix(in_srgb,var(--text-secondary)_14%,transparent)] text-ink-soft'

function hostOf(url) {
  try {
    return new URL(url).host.replace(/^www\./, '')
  } catch {
    return null
  }
}

export default function ProductDetail({ isSignedIn }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const { toast } = useToast()

  const [product, setProduct] = useState(null)
  const [slide, setSlide] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)
  const [confirm, confirmDialog] = useConfirm()

  const [currentAlert, setCurrentAlert] = useState(null)
  const [alertThreshold, setAlertThreshold] = useState('')
  const [alertActive, setAlertActive] = useState(true)
  const [alertLoading, setAlertLoading] = useState(false)
  const [alertError, setAlertError] = useState('')
  const [alertMessage, setAlertMessage] = useState('')

  useEffect(() => {
    let cancelled = false
    const fetchProduct = async () => {
      setLoading(true)
      setError('')

      try {
        const data = await getProduct(id)
        if (cancelled) return
        setProduct(data)
        setSlide(0)
      } catch (err) {
        if (!cancelled) setError(err.message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchProduct()
    return () => { cancelled = true }
  }, [id, reloadKey])

  useEffect(() => {
    if (!isSignedIn) {
      setCurrentAlert(null)
      setAlertThreshold('')
      setAlertActive(true)
      return
    }

    let cancelled = false
    const fetchAlert = async () => {
      setAlertLoading(true)
      setAlertError('')

      try {
        const alert = await findAlertForProduct(id)
        if (cancelled) return
        setCurrentAlert(alert)
        setAlertThreshold(alert?.thresholdPrice != null ? String(alert.thresholdPrice) : '')
        setAlertActive(alert?.active ?? true)
      } catch (err) {
        if (cancelled) return
        if (isUnauthorizedError(err)) {
          navigate('/login')
          return
        }
        setAlertError(err.message)
      } finally {
        if (!cancelled) setAlertLoading(false)
      }
    }

    fetchAlert()
    return () => { cancelled = true }
  }, [id, isSignedIn, navigate])

  const images = product?.images || []
  const hasImages = images.length > 0
  const hasMultiple = images.length > 1
  const trackedPrice = useMemo(() => getTrackedPrice(product), [product])
  const showFlash = hasFlashSalePrice(product)
  const showOriginal = hasOriginalPrice(product)
  const wasPrice = showFlash ? product?.price : showOriginal ? product?.originalPrice : null

  const prevSlide = () => setSlide((value) => (value - 1 + images.length) % images.length)
  const nextSlide = () => setSlide((value) => (value + 1) % images.length)

  const handleAlertSubmit = async (event) => {
    event.preventDefault()

    if (!alertThreshold) {
      setAlertError('Threshold price is required')
      return
    }

    const numericThreshold = Number(alertThreshold)
    if (!Number.isFinite(numericThreshold) || numericThreshold < 0) {
      setAlertError('Threshold price must be a valid non-negative number')
      return
    }

    setAlertLoading(true)
    setAlertError('')
    setAlertMessage('')

    try {
      if (currentAlert) {
        const updated = await updateAlert(currentAlert.id, {
          thresholdPrice: numericThreshold,
          active: alertActive
        })
        setCurrentAlert(updated)
        setAlertThreshold(String(updated.thresholdPrice))
        setAlertActive(updated.active)
        setAlertMessage('Alert updated.')
        toast('Price alert updated', { type: 'success' })
      } else {
        const created = await createAlert({
          productId: id,
          thresholdPrice: numericThreshold
        })
        setCurrentAlert(created)
        setAlertThreshold(String(created.thresholdPrice))
        setAlertActive(created.active)
        setAlertMessage('Alert created.')
        toast('Price alert created', { type: 'success' })
      }
    } catch (err) {
      if (isUnauthorizedError(err)) {
        navigate('/login')
        return
      }
      setAlertError(err.message)
    } finally {
      setAlertLoading(false)
    }
  }

  const handleDeleteAlert = async () => {
    if (!currentAlert) {
      return
    }

    const confirmed = await confirm({
      title: 'Delete this alert?',
      message: 'This removes the price alert for this product.',
      confirmLabel: 'Delete'
    })
    if (!confirmed) {
      return
    }

    setAlertLoading(true)
    setAlertError('')
    setAlertMessage('')

    try {
      await deleteAlert(currentAlert.id)
      setCurrentAlert(null)
      setAlertThreshold('')
      setAlertActive(true)
      setAlertMessage('Alert deleted.')
      toast('Price alert deleted', { type: 'info' })
    } catch (err) {
      if (isUnauthorizedError(err)) {
        navigate('/login')
        return
      }
      setAlertError(err.message)
    } finally {
      setAlertLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-6 py-8">
        <p className="sr-only" role="status">Loading product…</p>
        <div className="grid gap-10 lg:grid-cols-2">
          <div className="skeleton" style={{ aspectRatio: '1', borderRadius: 'var(--radius-lg)' }} />
          <div className="flex flex-col gap-4">
            <div className="skeleton" style={{ height: '36px', width: '70%' }} />
            <div className="skeleton" style={{ height: '90px' }} />
            <div className="skeleton" style={{ height: '160px' }} />
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="mx-auto max-w-5xl px-6 py-8">
        <ErrorState message={error} onRetry={() => setReloadKey((value) => value + 1)} />
      </div>
    )
  }

  if (!product) {
    return <div className="mx-auto max-w-5xl px-6 py-16 text-center text-ink-soft">Product not found.</div>
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      {confirmDialog}
      <AppLink to="/" className="inline-flex items-center gap-1.5 font-meta text-xs font-semibold uppercase tracking-[0.12em] text-ink-mute transition-colors hover:text-ink">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14" aria-hidden="true">
          <path d="M15 18l-6-6 6-6" />
        </svg>
        Back to products
      </AppLink>

      <div className="mt-6 grid gap-10 lg:grid-cols-2">
        {/* The image gallery. `relative aspect-square` on the frame with `absolute inset-0` on the
            track: the arrows and the rail position against the frame, and the frame's height comes
            from its aspect ratio, so taking the track out of flow means its height never has to
            resolve a percentage against an aspect-ratio box.
            The radius is written as the token rather than as a named step. The retired rule
            declared `border-radius: var(--radius)` — 8px — and `background: var(--bg-tertiary)`,
            and both beat the utilities written on this element, which have therefore never
            rendered. The plausible-looking replacement resolves to `var(--radius-lg)`, which
            index.css's UNLAYERED :root sets to 12px, so it would have grown the radius by half in
            the conversion that exists to keep it. No named step maps to plain `--radius`. */}
        <div>
          {hasImages ? (
            <>
              <div className="relative aspect-square overflow-hidden rounded-[var(--radius)] border border-line bg-tertiary">
                <div
                  className="absolute inset-0 flex transition-transform duration-[400ms] ease-[ease]"
                  style={{ transform: `translateX(-${slide * 100}%)` }}
                >
                  {images.map((image, index) => (
                    /* `min-w-full` is what makes the flex track one slide per viewport. Without it
                       every image collapses to intrinsic width on a single row. */
                    <div key={index} className="min-w-full">
                      <img
                        src={image}
                        alt={`${product.name} ${index + 1}`}
                        loading="lazy"
                        className="h-full w-full object-cover"
                      />
                    </div>
                  ))}
                </div>
                {hasMultiple && (
                  <>
                    <button type="button" className={cx(SWIPER_BTN, 'left-3')} onClick={prevSlide} aria-label="Previous image">&lt;</button>
                    <button type="button" className={cx(SWIPER_BTN, 'right-3')} onClick={nextSlide} aria-label="Next image">&gt;</button>
                  </>
                )}
              </div>
              {/* OUTSIDE the frame, and after it, so it is in flow. The arrows keep the frame to
                  themselves and the rail gets a row of its own to wrap into. See SWIPER_DOTS. */}
              {hasMultiple && (
                <div className={SWIPER_DOTS}>
                  {images.map((_, index) => (
                    <button
                      key={index}
                      type="button"
                      className={SWIPER_DOT}
                      onClick={() => setSlide(index)}
                      aria-label={`Go to image ${index + 1}`}
                      /* The only non-visual signal of which slide is showing. Without it the
                         painted core is the entire state and a screen reader reads five
                         identical "Go to image N" buttons. Not a regression — the retired
                         `.swiper-dot.active` was equally visual-only — but the naming and the
                         hit boxes were fixed around it and this is what was left.
                         `true`/undefined rather than `true`/`false`: `aria-current="false"` is a
                         real value, and announcing "not current" on four of five dots is worse
                         than saying nothing about them. */
                      aria-current={slide === index ? 'true' : undefined}
                    >
                      {/* A real element, not a pseudo-element: that is what lets the 44px hit
                          box and the 10px circle be sized independently, and it is what
                          replaces the `::after { inset: -10px }` hit expander whose 30x30 boxes
                          overlapped their neighbours by 12px. */}
                      <span
                        className={cx(
                          'block size-2.5 rounded-full',
                          slide === index ? 'bg-oxblood' : 'bg-ink-mute',
                        )}
                      />
                    </button>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="grid aspect-square place-items-center rounded-2xl border border-dashed border-line bg-surface font-display italic text-ink-mute">
              No image available
            </div>
          )}
        </div>

        {/* Editorial product hero */}
        <div>
          <Kicker>
            {hostOf(product.url) || 'Tracked product'}
            {product.sku ? ` · ${product.sku}` : ''}
          </Kicker>
          <h1 className="mt-3 font-display text-display-sm font-semibold leading-tight text-ink">
            {product.name}
          </h1>

          <div className="mt-6 flex flex-wrap items-end gap-4">
            <PriceDisplay value={trackedPrice} was={wasPrice} currency={product.currency} size="xl" />
            <DropBadge oldPrice={wasPrice} newPrice={trackedPrice} />
          </div>

          <dl className="mt-6 flex flex-wrap gap-x-8 gap-y-2 font-meta text-xs text-ink-mute">
            <div>
              <dt className="uppercase tracking-[0.12em]">Added</dt>
              <dd className="mt-0.5 text-ink-soft">{formatDate(product.createdAt)}</dd>
            </div>
            <div>
              <dt className="uppercase tracking-[0.12em]">Last updated</dt>
              <dd className="mt-0.5 text-ink-soft">{formatDate(product.updatedAt)}</dd>
            </div>
          </dl>

          <a
            href={product.url}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary mt-6 inline-flex"
          >
            View on website ↗
          </a>

          {isSignedIn ? (
            <div className="mt-6">
              <AddToBookmark productId={product.id} />

              {/* A wrapping row at every width, where the retired media block stacked the title
                  and the pill below 768px. Both children are short fixed strings, so `flex-wrap`
                  is safe here for the reason it was not safe on `.page-error`. The `mb-4` lives
                  on this row rather than on the heading: the heading is a flex item beside the
                  pill and flex centres the MARGIN box, so a margin there sat the text about 8px
                  above the pill's centre line and stacked with this row's own to give 32px of gap
                  where the other two panels have 16. */}
              <section className={cx(PANEL, 'mt-5')}>
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <h2 className={PANEL_TITLE}>Price alert</h2>
                  {currentAlert && (
                    <span className={cx(ALERT_STATUS, currentAlert.active ? ALERT_STATUS_ACTIVE : ALERT_STATUS_PAUSED)}>
                      {currentAlert.active ? 'Active' : 'Paused'}
                    </span>
                  )}
                </div>

                <form className="flex flex-col gap-3.5" onSubmit={handleAlertSubmit}>
                  {/* Before the input on purpose. Field renders its `hint` slot AFTER the control,
                      and this line is the context a reader needs in order to choose a threshold,
                      so it is a standalone paragraph above the field rather than a hint. It moves
                      from between the label and the input to above the label; still before the
                      control, which is the property that mattered. */}
                  <p className="text-sm text-ink-soft">
                    Current price: {formatPrice(trackedPrice, product.currency)}
                  </p>
                  <Field
                    id="threshold-price"
                    label="Threshold price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={alertThreshold}
                    onChange={(event) => setAlertThreshold(event.target.value)}
                    placeholder="Enter target price"
                  />

                  {currentAlert && (
                    <CheckboxRow
                      checked={alertActive}
                      onChange={(event) => setAlertActive(event.target.checked)}
                    >
                      Alert is active
                    </CheckboxRow>
                  )}

                  {/* A wrapping row at every width, where the retired media block stacked these
                      below 768px. Both labels are fixed short strings. */}
                  <div className="flex flex-wrap gap-3">
                    <button type="submit" className="btn btn-primary" disabled={alertLoading}>
                      {alertLoading ? 'Saving...' : currentAlert ? 'Update alert' : 'Create alert'}
                    </button>
                    {currentAlert && (
                      <button
                        type="button"
                        className="btn btn-danger"
                        onClick={handleDeleteAlert}
                        disabled={alertLoading}
                      >
                        Delete alert
                      </button>
                    )}
                  </div>
                </form>

                {/* No role on the success line: the same outcome already fires a toast, and
                    ToastProvider's host is `role="status" aria-live="polite"`, so announcing it
                    twice is worse than not at all. The error line has no toast behind it and is
                    the reader's only signal, so it gets `role="alert"`. */}
                {alertMessage && <p className="mt-3.5 text-success-deep">{alertMessage}</p>}
                {alertError && <p className="mt-3.5 text-danger" role="alert">{alertError}</p>}
              </section>
            </div>
          ) : (
            <section className={cx(PANEL, 'mt-6')}>
              <h2 className={cx(PANEL_TITLE, 'mb-4')}>Price alert</h2>
              <p className="text-ink-soft">Sign in to bookmark this product or create a price alert.</p>
            </section>
          )}
        </div>
      </div>

      {/* Price history */}
      <div className="mt-14">
        <SectionHeader title="Price history" meta={hostOf(product.url) || undefined} />
        <PriceHistoryChart productId={product.id} currency={product.currency} />
      </div>

      <section className={cx(PANEL_COMPACT, 'mt-10')}>
        <h2 className={cx(PANEL_TITLE, 'mb-4')}>Tracking notes</h2>
        <p className="text-ink-soft">
          Product created {formatDateTime(product.createdAt)} and last updated {formatDateTime(product.updatedAt)}.
        </p>
      </section>
    </div>
  )
}
