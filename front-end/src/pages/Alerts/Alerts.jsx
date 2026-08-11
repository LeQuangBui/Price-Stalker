import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { deleteAlert, getAlerts, updateAlert } from '../../api/alerts'
import { isUnauthorizedError } from '../../api/auth'
import { formatPrice, getTrackedPrice } from '../../utils/formatters'
import { useConfirm } from '../../components/ConfirmDialog/useConfirm'
import AppLink from '../../components/AppLink'
import Kicker from '../../components/primitives/Kicker'
import Pagination from '../../components/primitives/Pagination'
import CheckboxRow from '../../components/primitives/CheckboxRow'
import EmptyState from '../../components/primitives/EmptyState'
import ErrorState from '../../components/primitives/ErrorState'
import Field from '../../components/primitives/Field'

// One column at every width. `.alerts-list` was a bare `display: grid; gap: 16px` with no template
// and it stays that way. A `grid-cols-[repeat(auto-fill,minmax(360px,1fr))]` would read as an
// improvement, sail straight through width.guard — which cannot see inside minmax() — and put a
// real 360px floor back on every phone.
const ALERTS_LIST = 'grid gap-4'

// `rounded-[var(--radius)]`, not `rounded-lg`. The retired rule was `border-radius: var(--radius)`,
// which is 8px; `rounded-lg` resolves to `var(--radius-lg)`, which index.css's UNLAYERED :root sets
// to 12px and which therefore beats Tailwind's own `.5rem` theme key at every root size. There is
// no named step that means 8px.
const ALERT_CARD =
  'rounded-[var(--radius)] border border-line bg-paper p-5 shadow-[var(--shadow-sm)]'

// PLACEHOLDER — 26.25rem is NOT a measured number and must not be carried forward as one. Task 7
// sweeps this row and replaces it, and "no breakpoint at all" is one of the outcomes it may return.
//
// The retired stylesheet stacked this row below 768px, roughly 400px too early. The recon figure
// that showed it — a 360px floor on `.alert-card-main` as a row — was measured on `main`, where the
// floor is set by `.alert-field input`'s `min-width: 180px` and the control's 192px UA `size`
// default. This conversion deletes both. What is left setting the floor is the product name plus
// the toggle, and with `min-w-0` and `wrap-anywhere` on the left column that is likely far below
// 26.25rem. The recon figure was also internally inconsistent: 122px of shell, page and card box
// sits outside this row at 320px, so a 360px row cannot produce a 360px page floor.
//
// Rem, not px, and not `md:`, whatever the number turns out to be. The floor is set by this row's
// own type and padding, both of which grow with the reader's browser font size, so the viewport
// width at which it clears has to grow with them; that is what a rem breakpoint is. Precedent:
// PriceDisplay's min-[22.5rem] and min-[17rem].
//
// BOTH states are gated on the same step on purpose. A `max-width: 768px` block beside an `md:`
// variant applies both branches at exactly 768px on a 16px root, and leaves a 769-959px band where
// NEITHER applies on a 20px root.
const ALERT_CARD_MAIN =
  'mb-4 flex flex-col gap-5 min-[26.25rem]:flex-row min-[26.25rem]:justify-between'

export default function Alerts() {
  const [alerts, setAlerts] = useState([])
  const [drafts, setDrafts] = useState({})
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [savingId, setSavingId] = useState(null)
  const navigate = useNavigate()
  const [confirm, confirmDialog] = useConfirm()

  useEffect(() => {
    loadAlerts()
  }, [page])

  const loadAlerts = async () => {
    setLoading(true)
    setError('')

    try {
      const data = await getAlerts({ page, size: 20 })
      const content = data.content || []
      setAlerts(content)
      setTotalPages(data.totalPages || 0)
      setDrafts(Object.fromEntries(content.map((alert) => [
        alert.id,
        {
          thresholdPrice: alert.thresholdPrice != null ? String(alert.thresholdPrice) : '',
          active: !!alert.active
        }
      ])))
    } catch (err) {
      setError(err.message)
      if (isUnauthorizedError(err)) {
        navigate('/login')
      }
    } finally {
      setLoading(false)
    }
  }

  const isDirty = (alert) => {
    const draft = drafts[alert.id]
    if (!draft) {
      return false
    }

    return String(draft.thresholdPrice) !== String(alert.thresholdPrice)
      || Boolean(draft.active) !== Boolean(alert.active)
  }

  const handleDraftChange = (alertId, next) => {
    setDrafts((current) => ({
      ...current,
      [alertId]: {
        ...current[alertId],
        ...next
      }
    }))
  }

  const handleSave = async (alert) => {
    const draft = drafts[alert.id]

    if (draft.thresholdPrice === '' || draft.thresholdPrice == null) {
      setError('Threshold price is required.')
      return
    }

    const numericThreshold = Number(draft.thresholdPrice)

    if (!Number.isFinite(numericThreshold) || numericThreshold < 0) {
      setError('Threshold price must be a valid non-negative number.')
      return
    }

    setSavingId(alert.id)
    setError('')

    try {
      const updated = await updateAlert(alert.id, {
        thresholdPrice: numericThreshold,
        active: draft.active
      })
      setAlerts((current) => current.map((item) => item.id === updated.id ? updated : item))
      setDrafts((current) => ({
        ...current,
        [updated.id]: {
          thresholdPrice: String(updated.thresholdPrice),
          active: updated.active
        }
      }))
    } catch (err) {
      if (isUnauthorizedError(err)) {
        navigate('/login')
        return
      }
      setError(err.message)
    } finally {
      setSavingId(null)
    }
  }

  const handleDelete = async (alertId) => {
    const confirmed = await confirm({
      title: 'Delete this alert?',
      message: 'This removes the price alert. You can recreate it from the product page.',
      confirmLabel: 'Delete'
    })
    if (!confirmed) {
      return
    }

    try {
      await deleteAlert(alertId)
      setAlerts((current) => current.filter((alert) => alert.id !== alertId))
      setDrafts((current) => {
        const next = { ...current }
        delete next[alertId]
        return next
      })
    } catch (err) {
      if (isUnauthorizedError(err)) {
        navigate('/login')
        return
      }
      setError(err.message)
    }
  }

  const emptyState = useMemo(() => !loading && !error && alerts.length === 0, [alerts.length, error, loading])

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      {confirmDialog}
      <Kicker>Watchlist</Kicker>
      <div className="mt-3 mb-8 flex flex-wrap items-end justify-between gap-4 border-b-2 border-ink pb-4">
        <div>
          <h1 className="font-display text-display-sm font-semibold text-ink">My alerts</h1>
          <p className="mt-2 text-sm text-ink-soft">Create alerts from product pages and manage them here.</p>
        </div>
        <AppLink to="/" className="btn btn-secondary shrink-0">Browse products</AppLink>
      </div>

      {loading && (
        <>
          <p className="sr-only" role="status">Loading alerts…</p>
          <div className={ALERTS_LIST} aria-hidden="true">
            {/* `rounded-[var(--radius)]` for the same reason ALERT_CARD uses it: this stands in
                for a card, and `rounded-lg` is 12px against the card's 8px. */}
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="skeleton h-[150px] rounded-[var(--radius)]" />
            ))}
          </div>
        </>
      )}

      {/* `mb-6` is new. These four render conditions are independent booleans rather than a state
          machine, so the error box and a populated list paint together — a failed save shows the
          message above the cards it failed on — and today the two boxes touch. */}
      {error && <ErrorState className="mb-6" message={error} onRetry={loadAlerts} />}

      {emptyState && (
        <EmptyState
          title="No price alerts yet"
          /* The house button, not `.empty-state-cta`. That class was the last sub-44px CTA in the
             tree — 10px padding around inherited 16px type computes to 42px — and this was its
             only remaining call site, so the rule left with it. Bookmarks' empty state had
             already moved to `btn btn-primary`; the two had silently diverged. */
          action={<AppLink to="/" className="btn btn-primary">Browse products</AppLink>}
        >
          Set an alert on any product and we&apos;ll notify you when the price drops below your target.
        </EmptyState>
      )}

      {!loading && alerts.length > 0 && (
        <>
          <div className={ALERTS_LIST}>
            {alerts.map((alert) => {
              const draft = drafts[alert.id] || { thresholdPrice: '', active: false }
              const trackedPrice = getTrackedPrice(alert.product)

              return (
                <section key={alert.id} className={ALERT_CARD}>
                  <div className={ALERT_CARD_MAIN}>
                    {/* `min-w-0` is C13 and it is new. A flex item's automatic minimum is its
                        content's min-content size, and after this conversion the row is a row from
                        about 420px rather than from 768px — so one unbreakable model string in a
                        marketplace title would set the whole card's floor across the range where
                        it now matters most. */}
                    <div className="min-w-0">
                      {/* Two new utilities, both deliberate. `transition-colors`: this link swaps
                          colour on hover and had no transition, so it snapped, where every other
                          inline text link on this page and the product page already fades.
                          `wrap-anywhere`: `overflow-wrap: anywhere` is the only value that feeds
                          break opportunities into intrinsic sizing — `break-words` is
                          `overflow-wrap: break-word`, which is defined not to — so it is what makes
                          the `min-w-0` above reachable rather than theoretical. */}
                      <AppLink
                        to={`/products/${alert.product?.id}`}
                        className="text-lg font-bold text-ink no-underline transition-colors wrap-anywhere hover:text-oxblood"
                      >
                        {alert.product?.name || 'Unknown product'}
                      </AppLink>
                      <p className="mt-2 text-ink-soft">
                        Current price: {formatPrice(trackedPrice, alert.product?.currency)}
                      </p>
                    </div>

                    {/* `flex-wrap` is load-bearing, not tidiness: the field and the toggle do not
                        fit one line on a phone, and each is individually under width.guard's 320px
                        floor so nothing would say so.
                        `basis-[11rem] grow min-w-0` on the field is the other half, and `flex-1` is
                        the trap. Today's wrap comes from `min-width: 180px` plus the control's
                        192px UA `size` default, and this conversion deletes both; `flex: 1 1 0%`
                        would give the field a hypothetical main size of zero, and a zero-size item
                        can never overflow a flex line, so the toggle would be squeezed beside it at
                        every width instead of dropping under it. A real 11rem basis keeps the
                        break, `grow` fills the line once it has one, `min-w-0` lets it shrink when
                        the row does not wrap.
                        The gap is rem for the same reason the breakpoint is: this row's floor grows
                        with the reader, so the space inside it should too. 1.125rem is the retired
                        18px exactly at a 16px root. */}
                    <div className="flex flex-wrap items-end gap-[1.125rem]">
                      <Field
                        id={`threshold-${alert.id}`}
                        label="Threshold"
                        className="basis-[11rem] grow min-w-0"
                        type="number"
                        min="0"
                        step="0.01"
                        value={draft.thresholdPrice}
                        onChange={(event) =>
                          handleDraftChange(alert.id, { thresholdPrice: event.target.value })}
                      />

                      <CheckboxRow
                        title="When off, this alert is paused and won't send emails."
                        checked={draft.active}
                        onChange={(event) =>
                          handleDraftChange(alert.id, { active: event.target.checked })}
                      >
                        Active
                      </CheckboxRow>
                    </div>
                  </div>

                  {/* A wrapping row at every width, where the retired media block stacked these two
                      full-width below 768px. Both labels are literal short strings — about 160px
                      together with the gap — so they fit a 305px client, and `flex-wrap` is safe
                      here for the reason it was not safe on `.page-error`: flex line breaking uses
                      each item's UNWRAPPED max-content width, and neither of these is prose. */}
                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => handleSave(alert)}
                      disabled={savingId === alert.id || !isDirty(alert)}
                    >
                      {savingId === alert.id ? 'Saving...' : 'Save'}
                    </button>
                    <button
                      type="button"
                      className="btn btn-danger"
                      onClick={() => handleDelete(alert.id)}
                    >
                      Delete
                    </button>
                  </div>
                </section>
              )
            })}
          </div>

          <Pagination
            page={page}
            totalPages={totalPages}
            onPrev={() => setPage((value) => Math.max(0, value - 1))}
            onNext={() => setPage((value) => value + 1)}
          />
        </>
      )}
    </div>
  )
}
