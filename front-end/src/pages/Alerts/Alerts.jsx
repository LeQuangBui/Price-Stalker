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

// 21rem, and the number moved because the criterion did.
//
// The 18rem this line shipped with was derived from PAGE OVERFLOW — "the narrowest viewport at
// which the row clears and stays clear" — and the card satisfies that. It bought it by squeezing
// the one number the page exists to show. Measured against the same pinned fixture, header
// ablated, root 16: the threshold input's CONTENT box was 43px against 87.26px of value at 320px,
// so four of nine digits; 58px and six digits at 360; 71px and seven at 390. On `main` the same
// field was 192px wide with 166px of interior at every width, because `.alert-field input` carried
// `min-width: 180px` and the retirement deleted it. A step derived from whether the page scrolls
// sideways cannot see that, because a field squeezed to 43px is exactly how the page stops
// scrolling sideways.
//
// So the field gets its floor back — see the note at the call site — and the row may only engage
// once the whole card fits with that floor honoured. Re-swept with the row forced unconditional,
// the header AND the Pagination row ablated (Pagination overflows on its own account at raised
// roots and would otherwise set this number instead of the card), 1px steps:
//
//     root 16 -> 335px = 20.9375rem   root 20 -> 418px = 20.90rem   root 24 -> 501px = 20.875rem
//
// Largest is 20.9375rem, so the next quarter-rem step is 21. Tight rather than safe, the same way
// the old number was: 20.75rem fires at 332/415/498 and fails all three roots by 3px, while 21rem
// clears every one (+1px at 16, +2px at 20, +3px at 24).
//
// The step still earns its rem. At a 16px default it fires at 336px, so a 360px phone is a row; at
// 24px it fires at 504px, so the same phone stacks — and it has to, because at a 24px default the
// card's own content does not fit a 390px viewport in two columns at all.
//
// Measured page-level, not card-level. `scripts/probes/alert-card.js` reports
// `card.scrollWidth - card.clientWidth`, which stays 0 through all of this: the card is a grid item
// whose track is forced to its own min-content, so it is stretched wider than the viewport rather
// than overflowing inside itself.
//
// BOTH states are gated on the same step on purpose. A `max-width: 768px` block beside an `md:`
// variant applies both branches at exactly 768px on a 16px root, and leaves a 769-959px band where
// NEITHER applies on a 20px root.
const ALERT_CARD_MAIN =
  'mb-4 flex flex-col gap-5 min-[21rem]:flex-row min-[21rem]:justify-between'

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
                        The gap is rem for the same reason the breakpoint is: this row's floor grows
                        with the reader, so the space inside it should too. 1.125rem is the retired
                        18px exactly at a 16px root. */}
                    <div className="flex flex-wrap items-end gap-[1.125rem]">
                      {/* `min-w-[7.75rem]` is the floor `.alert-field input`'s `min-width: 180px`
                          used to be, and it is the whole reason the threshold is readable. Without
                          it the field shrinks to whatever is left of the row — 43px of interior at
                          320px against 87.26px of value, four digits of nine.

                          It is rem because the old one was px and that was the bug behind the bug:
                          the value is rem-sized, so a frozen 180px floor holds at a 16px browser
                          default and fails at a 24px one. Sized from the widest formatted
                          threshold in the fixture, `100000000`, plus the input's own `px-4` and its
                          1px borders, at each root:

                              root 16   87.26 + 32 + 2 = 121.26px = 7.579rem
                              root 20  109.07 + 40 + 2 = 151.07px = 7.554rem
                              root 24  130.89 + 48 + 2 = 180.89px = 7.537rem

                          Largest is 7.579rem; the next quarter-rem step is 7.75. Measured over 27
                          cells — roots 16/20/24 x 305/320/360/390/430/480/560/672/768 — that is all
                          nine digits readable in every one, in the stacked state as well as the
                          row, where today's markup reads 4 at 320/root 16 and 7 at 320/root 24.

                          NOT `basis-[11rem]`, which is the obvious lever and does nothing. A
                          shrinkable flex item's max-content contribution is clamped to its own
                          content's max-content, and this field's content is a label over a `w-full`
                          input that contributes no width — so the basis is thrown away before it
                          can influence how the row divides. Measured at 11, 14, 17 and 20rem: the
                          interior is identical to the pixel at every one of 27 cells. The basis
                          stays as the PREFERRED size; `min-width` is what holds the line.

                          `min-w-0` is what this replaces, and losing it is the point: it is exactly
                          the property that let the field shrink under the name column. The field
                          can still shrink — to 7.75rem — and below that the toggle wraps under it,
                          which is the break `flex-1` would have destroyed and `min-w-0` quietly
                          did too.

                          The floor costs 3px of page scroll in exactly one cell, a 305px client at
                          a 24px root, where 7.75rem is 186px against 185px of card interior. Taken
                          knowingly: two digits of the threshold are worth more than 3px, and that
                          same cell already scrolls 55px sideways on Pagination's account. Every
                          other cell measured is 0. */}

                      {/* Two deltas come with adopting the shared primitive, both accepted, both
                          recorded because this branch's standard is to record a 5px dot shift.
                          Radius: `var(--radius-sm)`, a frozen 6px, becomes Field's `rounded-xl` —
                          measured 12px at a 16px root, 15px at 20 and 18px at 24, so it doubles
                          and then scales where the retired value did neither. Focus ring: a 3px
                          spread at 18% srgb becomes `focus:ring-2` at 20% oklab, so 1px thinner,
                          two points stronger, and mixed in a different space. Both are Field's to
                          own now; changing them here would fork the primitive for one caller. */}
                      <Field
                        id={`threshold-${alert.id}`}
                        label="Threshold"
                        className="basis-[11rem] grow min-w-[7.75rem]"
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
