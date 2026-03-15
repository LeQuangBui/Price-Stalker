import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createProductByUrl } from '../../api/products'
import { addProductToBookmark } from '../../api/bookmarks'
import './AddByUrl.css'

// Props:
//   bookmarkId  — if provided, created product is added to this bookmark
//   onAdded(product) — called after product is created (and optionally added to bookmark)
export default function AddByUrl({ bookmarkId, onAdded }) {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!url.trim()) return

    setLoading(true)
    setError('')

    try {
      const product = await createProductByUrl(url.trim())

      if (bookmarkId) {
        await addProductToBookmark(bookmarkId, product.id)
      }

      setUrl('')
      if (onAdded) {
        onAdded(product)
      } else {
        navigate(`/products/${product.id}`)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="add-by-url">
      <input
        type="url"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="Paste a product URL..."
        className="add-by-url-input"
        disabled={loading}
      />
      <button type="submit" className="add-by-url-btn" disabled={loading || !url.trim()}>
        {loading ? 'Adding...' : 'Add'}
      </button>
      {error && <p className="add-by-url-error">{error}</p>}
    </form>
  )
}
