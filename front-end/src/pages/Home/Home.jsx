import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import ProductSearch from '../../components/ProductSearch/ProductSearch'
import ProductList from '../../components/ProductList/ProductList'
import AddByUrl from '../../components/AddByUrl/AddByUrl'
import { getProducts } from '../../api/products'
import './Home.css'

export default function Home() {
  const [searchParams, setSearchParams] = useState({})
  const [products, setProducts] = useState([])
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const navigate = useNavigate()

  const handleSearch = (params) => {
    setSearchParams(params)
    setPage(0)
  }

  const handleProductAdded = (product) => {
    navigate(`/products/${product.id}`)
  }

  useEffect(() => {
    setLoading(true)
    setError(null)
    getProducts({ ...searchParams, page })
      .then(data => {
        setProducts(data.content)
        setTotalPages(data.totalPages)
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [searchParams, page])

  return (
    <>
      <section className="search-layer mb-7 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(340px,0.42fr)]">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-raised)] p-4 shadow-[var(--shadow)] backdrop-blur-xl sm:p-5">
          <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="m-0 text-sm font-bold text-[var(--primary)]">Product radar</p>
              <h2 className="m-0 text-2xl font-black text-[var(--text-primary)]">Find and monitor prices</h2>
            </div>
            <p className="m-0 text-sm text-[var(--text-secondary)]">Search your catalog or paste a URL to start tracking.</p>
          </div>
          <ProductSearch
            onSearch={handleSearch}
            showSearchButton
            placeholder="Search products..."
          />
        </div>
        <div className="add-by-url-section">
          <span className="add-by-url-label">Track a new product</span>
          <AddByUrl onAdded={handleProductAdded} />
        </div>
      </section>
      {loading && <p className="loading-text">Loading...</p>}
      {error && <p className="error-text">{error}</p>}
      {!loading && !error && (
        <>
          <ProductList products={products} />
          {totalPages > 1 && (
            <div className="pagination">
              <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}>
                Previous
              </button>
              <span className="pagination-info">
                Page {page + 1} of {totalPages}
              </span>
              <button onClick={() => setPage(p => p + 1)} disabled={page >= totalPages - 1}>
                Next
              </button>
            </div>
          )}
        </>
      )}
    </>
  )
}
