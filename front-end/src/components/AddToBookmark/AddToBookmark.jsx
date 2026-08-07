import { useEffect, useRef, useState } from 'react'
import { createBookmark, getBookmarks, updateBookmark } from '../../api/bookmarks'
import './AddToBookmark.css'

export default function AddToBookmark({ productId }) {
  const [bookmarks, setBookmarks] = useState([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(false)
  const [savingBookmarkId, setSavingBookmarkId] = useState(null)
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const dropdownRef = useRef(null)

  useEffect(() => {
    if (!open) {
      return
    }

    setLoading(true)
    setError('')
    getBookmarks({ size: 100 })
      .then((data) => setBookmarks(data.content || []))
      .catch((err) => setError(err.message || 'Failed to load bookmarks'))
      .finally(() => setLoading(false))
  }, [open])

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const isProductInBookmark = (bookmark) =>
    bookmark.products?.some((product) => product.id === productId)

  const handleAddToExisting = async (bookmark) => {
    if (isProductInBookmark(bookmark)) {
      return
    }

    setSavingBookmarkId(bookmark.id)
    setError('')
    setSuccess('')

    try {
      const nextProductIds = [...(bookmark.products || []).map((product) => product.id), productId]
      const updated = await updateBookmark(bookmark.id, {
        name: bookmark.name,
        productIds: nextProductIds
      })

      setBookmarks((current) => current.map((item) => item.id === updated.id ? updated : item))
      setSuccess(`Saved to "${updated.name}".`)
    } catch (err) {
      setError(err.message || 'Failed to update bookmark')
    } finally {
      setSavingBookmarkId(null)
    }
  }

  const handleCreate = async (event) => {
    event.preventDefault()

    if (!name.trim()) {
      setError('Bookmark name is required')
      return
    }

    setCreating(true)
    setError('')
    setSuccess('')

    try {
      const bookmark = await createBookmark({
        name: name.trim(),
        productIds: [productId]
      })
      setBookmarks((current) => [bookmark, ...current])
      setName('')
      setSuccess(`Saved to new bookmark "${bookmark.name}".`)
    } catch (err) {
      setError(err.message || 'Failed to create bookmark')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="add-to-bookmark" ref={dropdownRef}>
      <button className="add-to-bookmark-btn" onClick={() => setOpen((value) => !value)} type="button">
        Save to Bookmark
      </button>

      {open && (
        <div className="bookmark-dropdown">
          <p className="bookmark-dropdown-title">Choose a bookmark</p>
          {loading && <p className="bookmark-dropdown-status">Loading...</p>}

          {!loading && (
            <div className="bookmark-existing-list">
              <p className="bookmark-dropdown-label">Existing bookmarks</p>
              {bookmarks.length === 0 && (
                <p className="bookmark-dropdown-status">No bookmarks yet. Create one below.</p>
              )}
              {bookmarks.map((bookmark) => {
                const alreadyAdded = isProductInBookmark(bookmark)
                const isSaving = savingBookmarkId === bookmark.id

                return (
                  <div key={bookmark.id} className="bookmark-existing-row">
                    <div className="bookmark-existing-meta">
                      <span className="bookmark-existing-name">{bookmark.name}</span>
                      <span className="bookmark-existing-count">
                        {bookmark.products?.length || 0} products
                      </span>
                    </div>
                    <button
                      type="button"
                      className="bookmark-existing-action"
                      onClick={() => handleAddToExisting(bookmark)}
                      disabled={alreadyAdded || isSaving}
                    >
                      {alreadyAdded ? 'Added' : isSaving ? 'Saving...' : 'Add'}
                    </button>
                  </div>
                )
              })}
            </div>
          )}

          <form className="bookmark-create-form" onSubmit={handleCreate}>
            <label className="bookmark-dropdown-label" htmlFor="bookmark-name-input">
              Create a new bookmark
            </label>
            <input
              id="bookmark-name-input"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Bookmark name"
              className="bookmark-name-input"
            />
            <button type="submit" className="bookmark-create-btn" disabled={creating}>
              {creating ? 'Saving...' : 'Create and Save'}
            </button>
          </form>

          {success && <p className="bookmark-dropdown-status success">{success}</p>}
          {error && <p className="bookmark-dropdown-status error">{error}</p>}
        </div>
      )}
    </div>
  )
}
