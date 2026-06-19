import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { deleteAlert, getAlerts, updateAlert } from '../../api/alerts'
import { isUnauthorizedError } from '../../api/auth'
import { formatPrice, getTrackedPrice } from '../../utils/formatters'
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
    if (!window.confirm('Delete this alert?')) {
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
    <div className="alerts-page">
      <div className="alerts-header">
        <div>
          <h2>My Alerts</h2>
          <p className="alerts-subtitle">Create new alerts from product pages and manage them here.</p>
        </div>
        <Link to="/" className="alerts-home-link">Browse products</Link>
      </div>

      {loading && <p className="alerts-state">Loading...</p>}
      {error && <p className="alerts-state error">{error}</p>}
      {emptyState && <p className="alerts-state">No alerts yet.</p>}

      {!loading && alerts.length > 0 && (
        <>
          <div className="alerts-list">
            {alerts.map((alert) => {
              const draft = drafts[alert.id] || { thresholdPrice: '', active: false }
              const trackedPrice = getTrackedPrice(alert.product)

              return (
                <section key={alert.id} className="alert-card">
                  <div className="alert-card-main">
                    <div className="alert-card-info">
                      <Link to={`/products/${alert.product?.id}`} className="alert-product-link">
                        {alert.product?.name || 'Unknown product'}
                      </Link>
                      <p className="alert-product-meta">
                        Current price: {formatPrice(trackedPrice)} {alert.product?.currency || ''}
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

                      <label className="alert-checkbox">
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
                      className="alert-action-button secondary"
                      onClick={() => handleDelete(alert.id)}
                    >
                      Delete
                    </button>
                  </div>
                </section>
              )
            })}
          </div>

          {totalPages > 1 && (
            <div className="pagination">
              <button onClick={() => setPage((value) => Math.max(0, value - 1))} disabled={page === 0}>
                Previous
              </button>
              <span className="pagination-info">Page {page + 1} of {totalPages}</span>
              <button onClick={() => setPage((value) => value + 1)} disabled={page >= totalPages - 1}>
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
