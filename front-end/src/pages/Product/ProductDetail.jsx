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
import {
  formatDate,
  formatDateTime,
  formatPrice,
  getTrackedPrice,
  hasFlashSalePrice,
  hasOriginalPrice
} from '../../utils/formatters'
import './ProductDetail.css'

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
        {/* Images (existing swiper, restyled frame) */}
        <div>
          {hasImages ? (
            <div className="swiper overflow-hidden rounded-2xl border border-line bg-paper">
              <div className="swiper-track" style={{ transform: `translateX(-${slide * 100}%)` }}>
                {images.map((image, index) => (
                  <div key={index} className="swiper-slide">
                    <img src={image} alt={`${product.name} ${index + 1}`} loading="lazy" />
                  </div>
                ))}
              </div>
              {hasMultiple && (
                <>
                  <button className="swiper-btn swiper-prev" onClick={prevSlide} aria-label="Previous image">&lt;</button>
                  <button className="swiper-btn swiper-next" onClick={nextSlide} aria-label="Next image">&gt;</button>
                  <div className="swiper-dots">
                    {images.map((_, index) => (
                      <button
                        key={index}
                        className={`swiper-dot${slide === index ? ' active' : ''}`}
                        onClick={() => setSlide(index)}
                        aria-label={`Go to image ${index + 1}`}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
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

              <section className="product-panel mt-5">
                <div className="product-panel-header">
                  <h2>Price alert</h2>
                  {currentAlert && (
                    <span className={`alert-status ${currentAlert.active ? 'active' : 'paused'}`}>
                      {currentAlert.active ? 'Active' : 'Paused'}
                    </span>
                  )}
                </div>

                <form className="alert-form" onSubmit={handleAlertSubmit}>
                  <label className="panel-label" htmlFor="threshold-price">Threshold price</label>
                  <p className="panel-hint">Current price: {formatPrice(trackedPrice, product.currency)}</p>
                  <input
                    id="threshold-price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={alertThreshold}
                    onChange={(event) => setAlertThreshold(event.target.value)}
                    className="panel-input"
                    placeholder="Enter target price"
                  />

                  {currentAlert && (
                    <label className="checkbox-row">
                      <input
                        type="checkbox"
                        checked={alertActive}
                        onChange={(event) => setAlertActive(event.target.checked)}
                      />
                      Alert is active
                    </label>
                  )}

                  <div className="alert-actions">
                    <button type="submit" className="panel-button" disabled={alertLoading}>
                      {alertLoading ? 'Saving...' : currentAlert ? 'Update alert' : 'Create alert'}
                    </button>
                    {currentAlert && (
                      <button
                        type="button"
                        className="panel-button secondary danger"
                        onClick={handleDeleteAlert}
                        disabled={alertLoading}
                      >
                        Delete alert
                      </button>
                    )}
                  </div>
                </form>

                {alertMessage && <p className="panel-message success">{alertMessage}</p>}
                {alertError && <p className="panel-message error-message">{alertError}</p>}
              </section>
            </div>
          ) : (
            <section className="product-panel mt-6">
              <h2>Price alert</h2>
              <p className="panel-text">Sign in to bookmark this product or create a price alert.</p>
            </section>
          )}
        </div>
      </div>

      {/* Price history */}
      <div className="mt-14">
        <SectionHeader title="Price history" meta={hostOf(product.url) || undefined} />
        <PriceHistoryChart productId={product.id} currency={product.currency} />
      </div>

      <section className="product-panel compact mt-10">
        <h2>Tracking notes</h2>
        <p className="panel-text">
          Product created {formatDateTime(product.createdAt)} and last updated {formatDateTime(product.updatedAt)}.
        </p>
      </section>
    </div>
  )
}
