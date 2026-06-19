import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AddByUrl from '../../components/AddByUrl/AddByUrl'
import ProductSearch from '../../components/ProductSearch/ProductSearch'
import {
  createBookmark,
  deleteBookmark,
  getBookmarks,
  updateBookmark
} from '../../api/bookmarks'
import { isUnauthorizedError } from '../../api/auth'
import { formatDate, formatPrice, getPrimaryImage, getTrackedPrice } from '../../utils/formatters'
import { useConfirm } from '../../components/ConfirmDialog/useConfirm'
import './Bookmarks.css'

export default function Bookmarks() {
  const [bookmarks, setBookmarks] = useState([])
  const [drafts, setDrafts] = useState({})
  const [collapsedIds, setCollapsedIds] = useState(new Set())
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newBookmarkName, setNewBookmarkName] = useState('')
  const [savingBookmarkId, setSavingBookmarkId] = useState(null)
  const navigate = useNavigate()
  const [confirm, confirmDialog] = useConfirm()

  useEffect(() => {
    fetchBookmarks()
  }, [page])

  const fetchBookmarks = async () => {
    setLoading(true)
    setError('')

    try {
      const data = await getBookmarks({ page })
      const content = data.content || []
      setBookmarks(content)
      setDrafts(buildDrafts(content))
      setCollapsedIds(new Set(content.map((bookmark) => bookmark.id)))
      setTotalPages(data.totalPages || 0)
    } catch (err) {
      setError(err.message)
      if (isUnauthorizedError(err)) {
        navigate('/login')
      }
    } finally {
      setLoading(false)
    }
  }

  const hasUnsavedChanges = (bookmarkId) => {
    const bookmark = bookmarks.find((item) => item.id === bookmarkId)
    const draft = drafts[bookmarkId]

    if (!bookmark || !draft) {
      return false
    }

    const currentIds = (bookmark.products || []).map((product) => product.id)
    const draftIds = (draft.products || []).map((product) => product.id)

    if (bookmark.name !== draft.name) {
      return true
    }

    if (currentIds.length !== draftIds.length) {
      return true
    }

    return currentIds.some((id, index) => id !== draftIds[index])
  }

  const toggleCollapseAll = () => {
    if (collapsedIds.size === bookmarks.length) {
      setCollapsedIds(new Set())
      return
    }

    setCollapsedIds(new Set(bookmarks.map((bookmark) => bookmark.id)))
  }

  const handleToggleCollapse = (bookmarkId) => {
    setCollapsedIds((current) => {
      const next = new Set(current)
      if (next.has(bookmarkId)) {
        next.delete(bookmarkId)
      } else {
        next.add(bookmarkId)
      }
      return next
    })
  }

  const handleDelete = async (id) => {
    const confirmed = await confirm({
      title: 'Delete this bookmark?',
      message: 'This permanently removes the bookmark and its product list.',
      confirmLabel: 'Delete'
    })
    if (!confirmed) {
      return
    }

    try {
      await deleteBookmark(id)
      setBookmarks((current) => current.filter((bookmark) => bookmark.id !== id))
      setDrafts((current) => {
        const next = { ...current }
        delete next[id]
        return next
      })
      setCollapsedIds((current) => {
        const next = new Set(current)
        next.delete(id)
        return next
      })
    } catch (err) {
      setError(`Failed to delete bookmark: ${err.message}`)
    }
  }

  const handleCreateBookmark = async (event) => {
    event.preventDefault()
    if (!newBookmarkName.trim()) {
      return
    }

    try {
      const bookmark = await createBookmark({ name: newBookmarkName.trim(), productIds: [] })
      setBookmarks((current) => [bookmark, ...current])
      setDrafts((current) => ({
        ...current,
        [bookmark.id]: cloneBookmark(bookmark)
      }))
      setCollapsedIds((current) => {
        const next = new Set(current)
        next.delete(bookmark.id)
        return next
      })
      setNewBookmarkName('')
      setShowCreateForm(false)
    } catch (err) {
      setError(`Failed to create bookmark: ${err.message}`)
    }
  }

  const handleProductSelect = (bookmarkId, product) => {
    setDrafts((current) => {
      const draft = current[bookmarkId]
      if (!draft) {
        return current
      }

      if (draft.products.some((item) => item.id === product.id)) {
        return current
      }

      return {
        ...current,
        [bookmarkId]: {
          ...draft,
          products: [...draft.products, product]
        }
      }
    })
  }

  const handleProductRemove = (bookmarkId, productId) => {
    setDrafts((current) => {
      const draft = current[bookmarkId]
      if (!draft) {
        return current
      }

      return {
        ...current,
        [bookmarkId]: {
          ...draft,
          products: draft.products.filter((product) => product.id !== productId)
        }
      }
    })
  }

  const handleSave = async (bookmarkId) => {
    const draft = drafts[bookmarkId]
    if (!draft) {
      return
    }

    setSavingBookmarkId(bookmarkId)
    setError('')

    try {
      const updated = await updateBookmark(bookmarkId, {
        name: draft.name,
        productIds: draft.products.map((product) => product.id)
      })

      setBookmarks((current) => current.map((bookmark) => bookmark.id === updated.id ? updated : bookmark))
      setDrafts((current) => ({
        ...current,
        [updated.id]: cloneBookmark(updated)
      }))
    } catch (err) {
      if (isUnauthorizedError(err)) {
        navigate('/login')
        return
      }
      setError(err.message)
    } finally {
      setSavingBookmarkId(null)
    }
  }

  const allCollapsed = useMemo(
    () => bookmarks.length > 0 && collapsedIds.size === bookmarks.length,
    [bookmarks.length, collapsedIds]
  )

  if (loading) {
    return (
      <div className="bookmarks-container">
        <p className="sr-only" role="status">Loading bookmarks…</p>
        <div className="bookmarks-grid" aria-hidden="true">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="skeleton bookmark-card-skeleton" />
          ))}
        </div>
      </div>
    )
  }
  if (error && bookmarks.length === 0) {
    return (
      <div className="bookmarks-container">
        <div className="page-error">
          <span>{error}</span>
          <button type="button" className="retry-btn" onClick={fetchBookmarks}>Retry</button>
        </div>
      </div>
    )
  }

  return (
    <div className="bookmarks-container">
      {confirmDialog}
      <div className="bookmarks-header">
        <div>
          <h2>My Bookmarks</h2>
          <p className="bookmarks-subtitle">
            Expand a bookmark, add products locally, then save the final list with one update request.
          </p>
        </div>

        <div className="bookmarks-header-actions">
          {bookmarks.length > 0 && (
            <button onClick={toggleCollapseAll} className="secondary-header-btn" type="button">
              {allCollapsed ? 'Expand All' : 'Collapse All'}
            </button>
          )}
          <button
            onClick={() => setShowCreateForm((value) => !value)}
            className="create-bookmark-btn"
            type="button"
          >
            {showCreateForm ? 'Cancel' : 'New Bookmark'}
          </button>
        </div>
      </div>

      {showCreateForm && (
        <form onSubmit={handleCreateBookmark} className="create-bookmark-form">
          <input
            type="text"
            value={newBookmarkName}
            onChange={(event) => setNewBookmarkName(event.target.value)}
            placeholder="Bookmark name"
            className="bookmark-name-input"
            autoFocus
          />
          <button type="submit" className="submit-btn">Create</button>
        </form>
      )}

      {error && bookmarks.length > 0 && <p className="save-error">{error}</p>}

      {bookmarks.length === 0 ? (
        <div className="empty-state">
          <h3>No bookmarks yet</h3>
          <p>Bookmarks group products you want to watch together. Create one, then add products by search or by pasting a URL.</p>
          <button type="button" className="empty-state-cta" onClick={() => setShowCreateForm(true)}>New Bookmark</button>
        </div>
      ) : (
        <>
          <div className="bookmarks-grid">
            {bookmarks.map((bookmark) => {
              const draft = drafts[bookmark.id] || cloneBookmark(bookmark)
              const isCollapsed = collapsedIds.has(bookmark.id)
              const dirty = hasUnsavedChanges(bookmark.id)
              const isSaving = savingBookmarkId === bookmark.id

              return (
                <section key={bookmark.id} className="bookmark-card">
                  <div className="bookmark-header">
                    <div>
                      <h3>{bookmark.name}</h3>
                      <div className="bookmark-info">
                        <span className="product-count">{draft.products.length} products</span>
                        <span className="bookmark-date">Created {formatDate(bookmark.createdAt)}</span>
                        {dirty && <span className="bookmark-dirty">Unsaved changes</span>}
                      </div>
                    </div>

                    <div className="bookmark-actions">
                      <button
                        type="button"
                        onClick={() => handleToggleCollapse(bookmark.id)}
                        className="expand-btn"
                      >
                        {isCollapsed ? 'Expand' : 'Collapse'}
                      </button>
                      <button
                        onClick={() => handleDelete(bookmark.id)}
                        className="delete-btn"
                        title="Delete bookmark"
                        type="button"
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  {!isCollapsed && (
                    <>
                      <div className="bookmark-editor">
                        <div className="product-search-panel">
                          <ProductSearch
                            placeholder="Search products to add..."
                            existingIds={draft.products.map((product) => product.id)}
                            onSelect={(product) => handleProductSelect(bookmark.id, product)}
                          />
                          <div className="or-divider"><span>or paste a URL</span></div>
                          <AddByUrl onAdded={(product) => handleProductSelect(bookmark.id, product)} />
                        </div>

                        <div className="editor-actions">
                          <button
                            type="button"
                            className="save-btn"
                            onClick={() => handleSave(bookmark.id)}
                            disabled={!dirty || isSaving}
                          >
                            {isSaving ? 'Saving...' : 'Save'}
                          </button>
                        </div>
                      </div>

                      {draft.products.length > 0 ? (
                        <div className="bookmark-products">
                          {draft.products.map((product) => (
                            <div key={product.id} className="product-preview">
                              <Link to={`/products/${product.id}`} className="product-preview-link">
                                {getPrimaryImage(product) ? (
                                  <img src={getPrimaryImage(product)} alt={product.name} />
                                ) : (
                                  <div className="product-preview-placeholder">No image</div>
                                )}

                                <div className="product-preview-info">
                                  <span className="product-name">{product.name}</span>
                                  <span className="product-price">
                                    {formatPrice(getTrackedPrice(product), product.currency)}
                                  </span>
                                </div>
                              </Link>

                              <button
                                type="button"
                                className="remove-product-btn"
                                onClick={() => handleProductRemove(bookmark.id, product.id)}
                              >
                                Remove
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="bookmark-empty">Add products above, then click Save.</p>
                      )}
                    </>
                  )}
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

function cloneBookmark(bookmark) {
  return {
    id: bookmark.id,
    name: bookmark.name,
    products: [...(bookmark.products || [])]
  }
}

function buildDrafts(bookmarks) {
  return Object.fromEntries(bookmarks.map((bookmark) => [bookmark.id, cloneBookmark(bookmark)]))
}
