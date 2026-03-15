import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getBookmarks, deleteBookmark, createBookmark, addProductToBookmark, removeProductFromBookmark } from '../../api/bookmarks'
import ProductSearch from '../../components/ProductSearch/ProductSearch'
import AddByUrl from '../../components/AddByUrl/AddByUrl'
import './Bookmarks.css'

export default function Bookmarks() {
  const formatPrice = (price) =>
    price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')

  const [bookmarks, setBookmarks] = useState([])
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newBookmarkName, setNewBookmarkName] = useState('')
  const [searchingBookmarkId, setSearchingBookmarkId] = useState(null)
  const [collapsedAll, setCollapsedAll] = useState(true)
  const [collapsedIds, setCollapsedIds] = useState(new Set())
  const navigate = useNavigate()

  useEffect(() => {
    fetchBookmarks()
  }, [page])

  const fetchBookmarks = async () => {
    setLoading(true)
    try {
      const data = await getBookmarks({ page })
      setBookmarks(data.content)
      setTotalPages(data.totalPages)
      setCollapsedIds(new Set(data.content.map(b => b.id)))
    } catch (err) {
      setError(err.message)
      if (err.message.includes('401') || err.message.includes('Unauthorized')) {
        navigate('/login')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this bookmark?')) return
    try {
      await deleteBookmark(id)
      setBookmarks(bookmarks.filter(b => b.id !== id))
    } catch (err) {
      alert('Failed to delete bookmark: ' + err.message)
    }
  }

  const handleCreateBookmark = async (e) => {
    e.preventDefault()
    if (!newBookmarkName.trim()) return
    try {
      const newBookmark = await createBookmark(newBookmarkName, [])
      setBookmarks([newBookmark, ...bookmarks])
      setNewBookmarkName('')
      setShowCreateForm(false)
      setSearchingBookmarkId(newBookmark.id)
    } catch (err) {
      alert('Failed to create bookmark: ' + err.message)
    }
  }

  const handleToggleCollapseAll = () => {
    if (collapsedAll) {
      setCollapsedIds(new Set())
    } else {
      setCollapsedIds(new Set(bookmarks.map(b => b.id)))
    }
    setCollapsedAll(!collapsedAll)
  }

  const handleToggleCollapse = (id) => {
    const next = new Set(collapsedIds)
    next.has(id) ? next.delete(id) : next.add(id)
    setCollapsedIds(next)
  }

  // Called by ProductSearch — needs to make the API call
  const handleSelectProduct = async (bookmarkId, product) => {
    try {
      await addProductToBookmark(bookmarkId, product.id)
      appendProduct(bookmarkId, product)
    } catch (err) {
      alert(err.message)
    }
  }

  // Called by AddByUrl — API call already done inside the component
  const appendProduct = (bookmarkId, product) => {
    setBookmarks(prev => prev.map(b =>
      b.id === bookmarkId
        ? { ...b, products: [...(b.products || []), product] }
        : b
    ))
  }

  const handleRemoveProduct = async (bookmarkId, productId) => {
    try {
      await removeProductFromBookmark(bookmarkId, productId)
      setBookmarks(bookmarks.map(b =>
        b.id === bookmarkId
          ? { ...b, products: b.products.filter(p => p.id !== productId) }
          : b
      ))
    } catch (err) {
      alert('Failed to remove product: ' + err.message)
    }
  }

  if (loading) return <div className="bookmarks-container">Loading...</div>
  if (error) return <div className="bookmarks-container error">{error}</div>

  return (
    <div className="bookmarks-container">
      <div className="bookmarks-header">
        <h2>My Bookmarks</h2>
        <div className="header-actions">
          {bookmarks.length > 0 && (
            <button onClick={handleToggleCollapseAll} className="collapse-all-btn">
              {collapsedAll ? '▼ Expand All' : '▲ Collapse All'}
            </button>
          )}
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="create-bookmark-btn"
          >
            {showCreateForm ? 'Cancel' : '+ New Bookmark'}
          </button>
        </div>
      </div>

      {showCreateForm && (
        <form onSubmit={handleCreateBookmark} className="create-bookmark-form">
          <input
            type="text"
            value={newBookmarkName}
            onChange={(e) => setNewBookmarkName(e.target.value)}
            placeholder="Bookmark name"
            className="bookmark-name-input"
            autoFocus
          />
          <button type="submit" className="submit-btn">Create</button>
        </form>
      )}

      {bookmarks.length === 0 ? (
        <p className="no-bookmarks">No bookmarks yet. Start tracking products!</p>
      ) : (
        <>
          <div className="bookmarks-grid">
            {bookmarks.map((bookmark) => (
              <div key={bookmark.id} className="bookmark-card">
                <div className="bookmark-header">
                  <h3>{bookmark.name}</h3>
                  <div className="bookmark-actions">
                    <button
                      onClick={() => {
                        if (collapsedIds.has(bookmark.id)) {
                          handleToggleCollapse(bookmark.id)
                          setSearchingBookmarkId(bookmark.id)
                        } else {
                          handleToggleCollapse(bookmark.id)
                          setSearchingBookmarkId(null)
                        }
                      }}
                      className="add-btn"
                      title={collapsedIds.has(bookmark.id) ? 'Expand and add products' : 'Collapse'}
                    >
                      {collapsedIds.has(bookmark.id) ? '+ Add Products' : '✕ Close'}
                    </button>
                    <button
                      onClick={() => handleDelete(bookmark.id)}
                      className="delete-btn"
                      title="Delete bookmark"
                    >
                      🗑️
                    </button>
                  </div>
                </div>

                {!collapsedIds.has(bookmark.id) && (
                  <>
                    <div className="bookmark-info">
                      <span className="product-count">
                        {bookmark.products?.length || 0} products
                      </span>
                      <span className="bookmark-date">
                        Created: {new Date(bookmark.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    <div className="product-search-panel">
                      <ProductSearch
                        placeholder="Search products to add..."
                        existingIds={(bookmark.products || []).map(p => p.id)}
                        onSelect={(product) => handleSelectProduct(bookmark.id, product)}
                      />
                      <div className="or-divider"><span>or paste a URL</span></div>
                      <AddByUrl
                        bookmarkId={bookmark.id}
                        onAdded={(product) => appendProduct(bookmark.id, product)}
                      />
                    </div>

                    {bookmark.products && bookmark.products.length > 0 && (
                      <div className="bookmark-products">
                        {bookmark.products.map((product) => (
                          <Link
                            key={product.id}
                            to={`/products/${product.id}`}
                            className="product-preview"
                          >
                            {product.images?.[0] && (
                              <img src={product.images[0]} alt={product.name} />
                            )}
                            <div className="product-preview-info">
                              <span className="product-name">{product.name}</span>
                              <span className="product-price">
                                {formatPrice(product.currentPrice)} {product.currency}
                              </span>
                            </div>
                            <button
                              onClick={(e) => {
                                e.preventDefault()
                                handleRemoveProduct(bookmark.id, product.id)
                              }}
                              className="remove-product-btn"
                              title="Remove from bookmark"
                            >
                              ✕
                            </button>
                          </Link>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="pagination">
              <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}>
                Previous
              </button>
              <span className="pagination-info">Page {page + 1} of {totalPages}</span>
              <button onClick={() => setPage(p => p + 1)} disabled={page >= totalPages - 1}>
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
