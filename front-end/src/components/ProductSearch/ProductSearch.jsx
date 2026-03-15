import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { getProducts } from '../../api/products'
import './ProductSearch.css'

// Props:
//   onSelect(product)  — bookmark mode: Enter/click adds the product
//   onSearch(params)   — home page mode: Enter/button triggers full search
//   showSearchButton   — show the Search button + type selector (home page mode)
//   placeholder        — input placeholder text
//   existingIds        — product ids already added (disables their button)
export default function ProductSearch({
  onSelect,
  onSearch,
  showSearchButton = false,
  placeholder = 'Search products...',
  existingIds = []
}) {
  const [query, setQuery] = useState('')
  const [searchType, setSearchType] = useState('all')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const debounceRef = useRef(null)
  const navigate = useNavigate()

  const formatPrice = (price) =>
    price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')

  const buildParams = (value) => {
    if (!value.trim()) return null
    if (searchType === 'url') return { url: value }
    if (searchType === 'website') return { website: value }
    return { search: value }
  }

  const handleChange = (value) => {
    setQuery(value)
    setActiveIndex(-1)
    clearTimeout(debounceRef.current)

    if (!value.trim()) {
      setResults([])
      setShowDropdown(false)
      return
    }

    debounceRef.current = setTimeout(async () => {
      setSearching(true)
      try {
        const params = buildParams(value)
        const data = await getProducts({ ...params, size: 6 })
        setResults(data.content)
        setShowDropdown(true)
      } catch {
        setResults([])
      } finally {
        setSearching(false)
      }
    }, 400)
  }

  const handleSelect = (product) => {
    if (onSelect) {
      onSelect(product)
    } else {
      navigate(`/products/${product.id}`)
    }
    setShowDropdown(false)
    setActiveIndex(-1)
  }

  const handleKeyDown = (e) => {
    if (showDropdown && results.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setActiveIndex(i => Math.min(i + 1, results.length - 1))
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setActiveIndex(i => Math.max(i - 1, -1))
        return
      }
      if (e.key === 'Enter' && activeIndex >= 0) {
        e.preventDefault()
        handleSelect(results[activeIndex])
        return
      }
    }

    if (e.key === 'Enter') {
      if (onSearch) {
        setShowDropdown(false)
        onSearch(buildParams(query) || {})
      }
    }

    if (e.key === 'Escape') {
      setShowDropdown(false)
      setActiveIndex(-1)
    }
  }

  const handleSearchClick = () => {
    if (onSearch) {
      setShowDropdown(false)
      onSearch(buildParams(query) || {})
    }
  }

  return (
    <div className="product-search">
      <div className="product-search-row">
        {showSearchButton && (
          <select
            value={searchType}
            onChange={(e) => setSearchType(e.target.value)}
            className="search-select"
          >
            <option value="all">All</option>
            <option value="url">URL</option>
            <option value="website">Website</option>
          </select>
        )}
        <input
          type="text"
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => results.length > 0 && setShowDropdown(true)}
          onBlur={() => setTimeout(() => { setShowDropdown(false); setActiveIndex(-1) }, 150)}
          placeholder={placeholder}
          className="search-input"
        />
        {showSearchButton && (
          <button onClick={handleSearchClick} className="search-button">
            Search
          </button>
        )}
      </div>

      {showDropdown && (
        <div className="search-dropdown">
          {searching && <p className="search-status">Searching...</p>}
          {!searching && results.length === 0 && (
            <p className="search-status">No results found</p>
          )}
          {results.map((product, index) => {
            const added = existingIds.includes(product.id)
            return (
              <div
                key={product.id}
                className={`search-dropdown-item${activeIndex === index ? ' active' : ''}`}
                onMouseEnter={() => setActiveIndex(index)}
                onMouseDown={() => handleSelect(product)}
              >
                {product.images?.[0] && (
                  <img src={product.images[0]} alt={product.name} />
                )}
                <div className="search-dropdown-info">
                  <span className="search-dropdown-name">{product.name}</span>
                  <span className="search-dropdown-price">
                    {formatPrice(product.currentPrice)} {product.currency}
                  </span>
                </div>
                {onSelect && (
                  <button
                    onMouseDown={(e) => { e.stopPropagation(); handleSelect(product) }}
                    disabled={added}
                    className="search-dropdown-btn"
                  >
                    {added ? 'Added' : '+ Add'}
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
