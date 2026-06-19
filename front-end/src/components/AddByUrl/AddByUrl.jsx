import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  createProductExtraction,
  getProduct,
  getProductExtraction
} from '../../api/products'
import './AddByUrl.css'

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
    <form onSubmit={handleSubmit} className="add-by-url">
      <input
        type="url"
        value={url}
        onChange={(event) => setUrl(event.target.value)}
        placeholder="Paste a product URL..."
        className="add-by-url-input"
        disabled={loading}
      />
      <button type="submit" className="add-by-url-btn" disabled={loading || !url.trim()}>
        {loading ? <span className="btn-spinner" /> : 'Add'}
      </button>
      {(status || pendingUrl) && (
        <div className="add-by-url-status" role="status">
          {status && <span className="add-by-url-status-pill">{formatStatus(status)}</span>}
          {pendingUrl && <span className="add-by-url-status-url">{pendingUrl}</span>}
        </div>
      )}
      {error && <p className="add-by-url-error">{error}</p>}
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
