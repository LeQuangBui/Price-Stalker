import { useState, useEffect } from 'react'
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

  const handleSearch = (params) => {
    setSearchParams(params)
    setPage(0)
  }

  const handleProductAdded = (product) => {
    setProducts(prev => [product, ...prev])
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
      <ProductSearch
        onSearch={handleSearch}
        showSearchButton
        placeholder="Search products..."
      />
      <div className="add-by-url-section">
        <span className="add-by-url-label">Track a new product:</span>
        <AddByUrl onAdded={handleProductAdded} />
      </div>
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
