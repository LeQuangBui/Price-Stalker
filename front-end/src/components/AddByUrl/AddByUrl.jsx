import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  createProductExtraction,
  getProduct,
  getProductExtraction
} from '../../api/products'

const POLL_DELAY_MS = 2500
const MAX_POLLS = 36

export default function AddByUrl({ onAdded }) {
  const [url, setUrl] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [polling, setPolling] = useState(false)
  const [status, setStatus] = useState('')
  const [pendingUrl, setPendingUrl] = useState('')
  const [error, setError] = useState('')
  const timerRef = useRef(null)
  const pollCountRef = useRef(0)
  const navigate = useNavigate()
  const loading = submitting || polling

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
    }
  }, [])

  const clearPollTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }

  const finishWithProduct = async (productId) => {
    const product = await getProduct(productId)
    clearPollTimer()
    setSubmitting(false)
    setPolling(false)
    setStatus('')
    setPendingUrl('')
    setUrl('')

    if (onAdded) {
      onAdded(product)
    } else {
      navigate(`/products/${product.id}`)
    }
  }

  const schedulePoll = (requestId) => {
    clearPollTimer()
    timerRef.current = setTimeout(async () => {
      try {
        const extraction = await getProductExtraction(requestId)
        const nextStatus = extraction.status || 'QUEUED'
        setStatus(nextStatus)

        if (nextStatus === 'COMPLETED' && extraction.productId) {
          await finishWithProduct(extraction.productId)
          return
        }

        if (nextStatus === 'FAILED') {
          setError(extraction.errorMessage || 'Extraction failed')
          setPolling(false)
          return
        }

        pollCountRef.current += 1
        if (pollCountRef.current >= MAX_POLLS) {
          setError('Extraction is still running. Check back in a moment.')
          setPolling(false)
          return
        }

        schedulePoll(requestId)
      } catch (err) {
        setError(err.message)
        setPolling(false)
      }
    }, POLL_DELAY_MS)
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    const trimmedUrl = url.trim()
    if (!trimmedUrl) return

    clearPollTimer()
    setSubmitting(true)
    setPolling(false)
    setStatus('')
    setPendingUrl('')
    setError('')

    try {
      const extraction = await createProductExtraction(trimmedUrl)
      const nextStatus = extraction.status || 'QUEUED'
      setStatus(nextStatus)
      setPendingUrl(trimmedUrl)

      if (nextStatus === 'COMPLETED' && extraction.productId) {
        await finishWithProduct(extraction.productId)
        return
      }

      if (nextStatus === 'FAILED') {
        setError(extraction.errorMessage || 'Extraction failed')
        return
      }

      pollCountRef.current = 0
      setPolling(true)
      schedulePoll(extraction.requestId)
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full flex-wrap items-center gap-3">
      {/* `flex-[1_1_250px] min-w-0` replaces `flex: 1; min-width: 250px`, and the swap is the
          point: both give the input a 250px hypothetical main size, so the button wraps below it
          at exactly the width it always did — both of this form's homes are narrow columns, and
          both wrap at 320 and 390 today — but only the basis lets the input then shrink under
          250px instead of setting the page's scroll width. Px deliberately, not rem: the basis
          exists to fit a VIEWPORT, and a rem basis grows with the reader while the viewport does
          not (ProductSearch.jsx's input carries the same reasoning on the sibling row, inherited
          from the stylesheet both retirements spent). Unlike that sibling there is no column
          state here to undo the basis in — this row wraps at every width, no media query.

          Focus: the ring is this input's only focus indicator — index.css's :focus-visible rule
          covers a / button / [role="button"], not inputs — so the retired :focus block becomes
          the Field pattern, recording the same delta 2b-iii did: a 3px spread at 18% srgb becomes
          `focus:ring-2` at 20% oklab, 1px thinner, two points stronger, mixed in a different
          space. The transition stays the retired three-property list rather than
          `transition-colors`, because the ring is a box-shadow and transition-colors would let it
          pop in where it has always faded. */}
      <input
        type="url"
        value={url}
        onChange={(event) => setUrl(event.target.value)}
        placeholder="Paste a product URL..."
        className="min-w-0 flex-[1_1_250px] rounded-[var(--radius-sm)] border border-line bg-paper px-4 py-3 text-base text-ink shadow-[var(--shadow-sm)] outline-none transition-[border-color,box-shadow,background-color] duration-200 placeholder:text-ink-mute focus:border-oxblood focus:ring-2 focus:ring-oxblood/20"
        disabled={loading}
      />
      {/* The aria-label is stable, not loading-only: while the extraction runs the content is a
          bare spinner span, which left the button with an empty accessible name exactly when a
          reader needs to know what is running. `min-h-11` brings the loading box up from the
          measured ~72×40 to the 44px floor, and `min-w-[72px]` keeps the box from jumping when
          "Add" swaps to the 16px spinner. 15px is not a rem step, so the size converts the way
          ProductList's did — `text-[0.9375rem]`, rem so it grows with the reader.
          `enabled:hover:` — Pagination's spelling — is the retired `:hover:not(:disabled)` as
          variants, so a disabled button still does not light up under the pointer. */}
      <button
        type="submit"
        aria-label="Add product by URL"
        className="flex min-h-11 min-w-[72px] cursor-pointer items-center justify-center rounded-[var(--radius-sm)] bg-oxblood px-6 py-3 text-[0.9375rem] font-semibold text-white transition-[background-color] duration-200 enabled:hover:bg-oxblood-deep disabled:cursor-not-allowed disabled:bg-tertiary disabled:text-ink-mute"
        disabled={loading || !url.trim()}
      >
        {/* The retired keyframes ran 0.7s where `animate-spin` runs 1s — accepted and recorded.
            Same border trick otherwise: a 40% white ring with a solid top arm. */}
        {loading
          ? <span className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
          : 'Add'}
      </button>
      {(status || pendingUrl) && (
        <div className="flex min-h-7 w-full items-center gap-2.5 text-xs" role="status">
          {/* Inline token mix, not an arbitrary background utility: Tailwind ships a SOLID
              pre-@supports fallback under an arbitrary color-mix, which here would be solid
              --primary under text-oxblood — the pill vanishes into its own background. The CSSOM
              refuses a value it cannot parse instead of substituting one, so this degrades to no
              tint under oxblood text, legible either way. DropBadge.jsx is the reference.
              13px is not a rem step and this is a compact status line, so the row reads text-xs,
              the same call the product page's pill made. */}
          {status && (
            <span
              className="flex-none rounded-[var(--radius-sm)] px-2 py-1 font-bold text-oxblood"
              style={{ background: 'color-mix(in srgb, var(--primary) 14%, var(--bg-tertiary))' }}
            >
              {formatStatus(status)}
            </span>
          )}
          {/* The crawler URL, an unbroken run of characters. `truncate` keeps the retired
              nowrap-plus-ellipsis and `min-w-0` keeps the run from setting a min-content floor —
              this span is the URL the Bookmarks grid comment blames for a 606px scroll width. */}
          {pendingUrl && <span className="min-w-0 truncate text-ink-mute">{pendingUrl}</span>}
        </div>
      )}
      {error && <p className="m-0 w-full text-xs font-medium text-danger">{error}</p>}
    </form>
  )
}

function formatStatus(status) {
  return status
    .toLowerCase()
    .split('_')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}
