import { useState, useEffect, useRef } from 'react'
import { getBookmarks, addProductToBookmark } from '../../api/bookmarks'
import './AddToBookmark.css'

export default function AddToBookmark({ productId }) {
  const [bookmarks, setBookmarks] = useState([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [added, setAdded] = useState({}) // bookmarkId -> bool
  const [error, setError] = useState('')
  const dropdownRef = useRef(null)

  useEffect(() => {
    if (!open) return
    setLoading(true)
    setError('')
    getBookmarks({ size: 100 })
      .then(data => setBookmarks(data.content))
      .catch(() => setError('Failed to load bookmarks'))
      .finally(() => setLoading(false))
  }, [open])

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleAdd = async (bookmarkId) => {
    try {
      await addProductToBookmark(bookmarkId, productId)
      setAdded(prev => ({ ...prev, [bookmarkId]: true }))
    } catch (err) {
      alert(err.message)
    }
  }

  return (
    <div className="add-to-bookmark" ref={dropdownRef}>
      <button className="add-to-bookmark-btn" onClick={() => setOpen(!open)}>
        🔖 Save to Bookmark
      </button>

      {open && (
        <div className="bookmark-dropdown">
          <p className="bookmark-dropdown-title">Save to...</p>
          {loading && <p className="bookmark-dropdown-status">Loading...</p>}
          {error && <p className="bookmark-dropdown-status error">{error}</p>}
          {!loading && !error && bookmarks.length === 0 && (
            <p className="bookmark-dropdown-status">No bookmarks yet. Create one first.</p>
          )}
          {bookmarks.map(bookmark => {
            const isAdded = added[bookmark.id] ||
              bookmark.products?.some(p => p.id === productId)
            return (
              <button
                key={bookmark.id}
                onClick={() => handleAdd(bookmark.id)}
                disabled={isAdded}
                className="bookmark-dropdown-item"
              >
                <span>{bookmark.name}</span>
                {isAdded && <span className="checkmark">✓</span>}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
