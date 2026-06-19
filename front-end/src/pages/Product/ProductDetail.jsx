import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { createAlert, deleteAlert, findAlertForProduct, updateAlert } from '../../api/alerts'
import { isUnauthorizedError } from '../../api/auth'
import { getProduct } from '../../api/products'
import AddToBookmark from '../../components/AddToBookmark/AddToBookmark'
import PriceHistoryChart from '../../components/PriceHistoryChart/PriceHistoryChart'
import {
  formatDate,
  formatDateTime,
  formatPrice,
  getTrackedPrice,
  hasFlashSalePrice,
  hasOriginalPrice
} from '../../utils/formatters'
import './ProductDetail.css'

export default function ProductDetail({ isSignedIn }) {
  const { id } = useParams()
  const navigate = useNavigate()

  const [product, setProduct] = useState(null)
  const [slide, setSlide] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [currentAlert, setCurrentAlert] = useState(null)
  const [alertThreshold, setAlertThreshold] = useState('')
  const [alertActive, setAlertActive] = useState(true)
  const [alertLoading, setAlertLoading] = useState(false)
  const [alertError, setAlertError] = useState('')
  const [alertMessage, setAlertMessage] = useState('')

  useEffect(() => {
    const fetchProduct = async () => {
      setLoading(true)
      setError('')

      try {
        const data = await getProduct(id)
        setProduct(data)
        setSlide(0)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchProduct()
  }, [id])

  useEffect(() => {
    if (!isSignedIn) {
      setCurrentAlert(null)
      setAlertThreshold('')
      setAlertActive(true)
      return
    }

    const fetchAlert = async () => {
      setAlertLoading(true)
      setAlertError('')

      try {
        const alert = await findAlertForProduct(id)
        setCurrentAlert(alert)
        setAlertThreshold(alert?.thresholdPrice != null ? String(alert.thresholdPrice) : '')
        setAlertActive(alert?.active ?? true)
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

    fetchAlert()
  }, [id, isSignedIn, navigate])

  const images = product?.images || []
  const hasImages = images.length > 0
  const hasMultiple = images.length > 1
  const trackedPrice = useMemo(() => getTrackedPrice(product), [product])
  const showFlash = hasFlashSalePrice(product)
  const showOriginal = hasOriginalPrice(product)

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
      } else {
        const created = await createAlert({
          productId: id,
          thresholdPrice: numericThreshold
        })
        setCurrentAlert(created)
        setAlertThreshold(String(created.thresholdPrice))
        setAlertActive(created.active)
        setAlertMessage('Alert created.')
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
    if (!currentAlert || !window.confirm('Delete this alert?')) {
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
    return <div className="product-detail-container">Loading...</div>
  }

  if (error) {
    return <div className="product-detail-container error">{error}</div>
  }

  if (!product) {
    return <div className="product-detail-container">Product not found.</div>
  }

  return (
    <div className="product-detail-container">
      <Link to="/" className="back-link">&lt;- Back to products</Link>

      <div className="product-detail">
        <div className="product-images">
          {hasImages ? (
            <div className="swiper">
              <div className="swiper-track" style={{ transform: `translateX(-${slide * 100}%)` }}>
                {images.map((image, index) => (
                  <div key={index} className="swiper-slide">
                    <img src={image} alt={`${product.name} ${index + 1}`} />
                  </div>
                ))}
              </div>

              {hasMultiple && (
                <>
                  <button className="swiper-btn swiper-prev" onClick={prevSlide} aria-label="Previous image">
                    &lt;
                  </button>
                  <button className="swiper-btn swiper-next" onClick={nextSlide} aria-label="Next image">
                    &gt;
                  </button>
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
            <div className="no-image">No image available</div>
          )}
        </div>

        <div className="product-info">
          <h1>{product.name}</h1>

          {product.sku && (
            <p className="product-sku">SKU: {product.sku}</p>
          )}

          <div className="product-price">
            {showFlash && (
              <span className="price-flash">{formatPrice(product.flash_sale_price)} {product.currency || ''}</span>
            )}
            <span className={`price-amount${showFlash ? ' price-struck' : ''}`}>
              {formatPrice(product.price)} {product.currency || ''}
            </span>
            {showOriginal && (
              <span className="price-original">{formatPrice(product.originalPrice)} {product.currency || ''}</span>
            )}
          </div>

          <div className="product-meta">
            <div className="meta-item">
              <span className="meta-label">Added:</span>
              <span className="meta-value">{formatDate(product.createdAt)}</span>
            </div>
            <div className="meta-item">
              <span className="meta-label">Last updated:</span>
              <span className="meta-value">{formatDate(product.updatedAt)}</span>
            </div>
          </div>

          <a
            href={product.url}
            target="_blank"
            rel="noopener noreferrer"
            className="view-product-btn"
          >
            View on website
          </a>

          {isSignedIn ? (
            <>
              <AddToBookmark productId={product.id} />

              <section className="product-panel">
                <div className="product-panel-header">
                  <h2>Price Alert</h2>
                  {currentAlert && (
                    <span className={`alert-status ${currentAlert.active ? 'active' : 'paused'}`}>
                      {currentAlert.active ? 'Active' : 'Paused'}
                    </span>
                  )}
                </div>

                <form className="alert-form" onSubmit={handleAlertSubmit}>
                  <label className="panel-label" htmlFor="threshold-price">Threshold price</label>
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
            </>
          ) : (
            <section className="product-panel">
              <h2>Price Alert</h2>
              <p className="panel-text">Sign in to save this product to a bookmark or create a price alert.</p>
            </section>
          )}
        </div>
      </div>

      {currentAlert && (
        <section className="product-panel compact">
          <h2>Current Alert Summary</h2>
          <div className="product-meta">
            <div className="meta-item">
              <span className="meta-label">Threshold:</span>
              <span className="meta-value">{formatPrice(currentAlert.thresholdPrice)} {product.currency || ''}</span>
            </div>
            <div className="meta-item">
              <span className="meta-label">Status:</span>
              <span className="meta-value">{currentAlert.active ? 'Active' : 'Paused'}</span>
            </div>
            <div className="meta-item">
              <span className="meta-label">Last known price:</span>
              <span className="meta-value">{formatPrice(trackedPrice)} {product.currency || ''}</span>
            </div>
          </div>
        </section>
      )}

      <PriceHistoryChart productId={product.id} />

      <section className="product-panel compact">
        <h2>Tracking Notes</h2>
        <p className="panel-text">
          Product created {formatDateTime(product.createdAt)} and last updated {formatDateTime(product.updatedAt)}.
        </p>
      </section>
    </div>
  )
}
