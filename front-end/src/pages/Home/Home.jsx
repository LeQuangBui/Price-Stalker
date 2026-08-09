import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import ProductSearch from '../../components/ProductSearch/ProductSearch'
import ProductList, { PRODUCT_GRID } from '../../components/ProductList/ProductList'
import AddByUrl from '../../components/AddByUrl/AddByUrl'
import AppLink from '../../components/AppLink'
import Kicker from '../../components/primitives/Kicker'
import SectionHeader from '../../components/primitives/SectionHeader'
import Reveal from '../../components/primitives/Reveal'
import Pagination from '../../components/primitives/Pagination'
import ErrorState from '../../components/primitives/ErrorState'
import { getProducts } from '../../api/products'
import Onboarding from '../../components/Onboarding/Onboarding'

export default function Home({ isSignedIn = false }) {
  const [searchParams, setSearchParams] = useState({})
  const [products, setProducts] = useState([])
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [reloadKey, setReloadKey] = useState(0)
  const navigate = useNavigate()

  const handleSearch = (params) => {
    setSearchParams(params)
    setPage(0)
  }

  const handleProductAdded = (product) => {
    navigate(`/products/${product.id}`)
  }

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    getProducts({ ...searchParams, page })
      .then(data => {
        if (cancelled) return
        setProducts(Array.isArray(data?.content) ? data.content : [])
        setTotalPages(data?.totalPages || 0)
      })
      .catch(err => { if (!cancelled) setError(err.message) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [searchParams, page, reloadKey])

  const hasActiveSearch = Object.keys(searchParams).length > 0
  const showOnboarding = isSignedIn && !loading && !error && products.length === 0 && !hasActiveSearch

  return (
    <div className="mx-auto max-w-6xl px-6">
      {/* Poster hero */}
      <section className="py-12">
        <Reveal>
          <Kicker>Live price desk</Kicker>
        </Reveal>
        <Reveal delay={80}>
          <h1 className="mt-5 font-display text-display font-semibold leading-none tracking-tight text-ink">
            Track the price.
            <br />
            <em className="italic text-oxblood">Strike</em> when it drops.
          </h1>
        </Reveal>
      </section>

      <section
        className="search-layer relative z-40 mb-10 rounded-2xl border border-line bg-surface p-5 sm:p-6"
        style={{ boxShadow: 'var(--shadow)' }}
      >
        <p className="m-0 font-meta text-xs font-semibold uppercase tracking-[0.16em] text-oxblood">
          Product radar
        </p>

        {/* Primary action — track a new product by URL (sign-in required: backend gates extraction) */}
        <div className="mt-4">
          <label className="mb-2 block font-meta text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-mute">
            Track a new product
          </label>
          {isSignedIn ? (
            <AddByUrl onAdded={handleProductAdded} />
          ) : (
            <p className="m-0 text-sm text-ink-soft">
              <AppLink to="/login" className="font-semibold text-oxblood underline">Sign in</AppLink> to track a product by URL.
            </p>
          )}
        </div>

        {/* Secondary — search what you already track */}
        <div className="mt-5 border-t border-line-soft pt-5">
          <label className="mb-2 block font-meta text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-mute">
            Search your watchlist
          </label>
          <ProductSearch onSearch={handleSearch} showSearchButton placeholder="Search your tracked products…" />
        </div>
      </section>

      <SectionHeader
        title={showOnboarding ? 'Get started' : "What you're tracking"}
        meta={products.length ? `${products.length} shown` : null}
      />

      {loading && (
        <>
          <p className="sr-only" role="status">Loading products…</p>
          <div className={PRODUCT_GRID} aria-hidden="true">
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="skeleton h-[280px] rounded-2xl" />
            ))}
          </div>
        </>
      )}
      {error && <ErrorState message={error} onRetry={() => setReloadKey((value) => value + 1)} />}
      {!loading && !error && showOnboarding && <Onboarding />}
      {!loading && !error && !showOnboarding && (
        <>
          <ProductList products={products} />
          <Pagination
            page={page}
            totalPages={totalPages}
            onPrev={() => setPage((p) => Math.max(0, p - 1))}
            onNext={() => setPage((p) => p + 1)}
          />
        </>
      )}
    </div>
  )
}
