import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { deleteAlert, getAlerts, updateAlert } from '../../api/alerts'
import { isUnauthorizedError } from '../../api/auth'
import { formatPrice, getTrackedPrice } from '../../utils/formatters'
import { useConfirm } from '../../components/ConfirmDialog/useConfirm'
import AppLink from '../../components/AppLink'
import Kicker from '../../components/primitives/Kicker'
import Pagination from '../../components/primitives/Pagination'
import './Alerts.css'

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
          <div className="alerts-list" aria-hidden="true">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="skeleton alert-card-skeleton" />
            ))}
          </div>
        </>
      )}
      {error && (
        <div className="alerts-state error">
          <span>{error}</span>
          <button type="button" className="retry-btn" onClick={loadAlerts}>Retry</button>
        </div>
      )}

      {emptyState && (
        <div className="empty-state">
          <h3>No price alerts yet</h3>
          <p>Set an alert on any product and we&apos;ll notify you when the price drops below your target.</p>
          {/* The house button, not `.empty-state-cta`. That class was the last sub-44px CTA in the
              tree — 10px padding around inherited 16px type computes to 42px — and this was its
              only remaining call site, so the rule left with it. Bookmarks' empty state had
              already moved to `btn btn-primary`; the two had silently diverged. */}
          <AppLink to="/" className="btn btn-primary">Browse products</AppLink>
        </div>
      )}

      {!loading && alerts.length > 0 && (
        <>
          <div className="alerts-list">
            {alerts.map((alert) => {
              const draft = drafts[alert.id] || { thresholdPrice: '', active: false }
              const trackedPrice = getTrackedPrice(alert.product)

              return (
                <section key={alert.id} className="alert-card">
                  <div className="alert-card-main">
                    <div>
                      <AppLink to={`/products/${alert.product?.id}`} className="alert-product-link">
                        {alert.product?.name || 'Unknown product'}
                      </AppLink>
                      <p className="alert-product-meta">
                        Current price: {formatPrice(trackedPrice, alert.product?.currency)}
                      </p>
                    </div>

                    <div className="alert-card-controls">
                      <label className="alert-field">
                        <span>Threshold</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={draft.thresholdPrice}
                          onChange={(event) => handleDraftChange(alert.id, { thresholdPrice: event.target.value })}
                        />
                      </label>

                      <label className="alert-checkbox" title="When off, this alert is paused and won't send emails.">
                        <input
                          type="checkbox"
                          checked={draft.active}
                          onChange={(event) => handleDraftChange(alert.id, { active: event.target.checked })}
                        />
                        Active
                      </label>
                    </div>
                  </div>

                  <div className="alert-card-actions">
                    <button
                      className="alert-action-button"
                      onClick={() => handleSave(alert)}
                      disabled={savingId === alert.id || !isDirty(alert)}
                    >
                      {savingId === alert.id ? 'Saving...' : 'Save'}
                    </button>
                    <button
                      className="alert-action-button danger"
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
