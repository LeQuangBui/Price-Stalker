import { useEffect, useId, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getProducts } from '../../api/products'
import { formatPrice, getTrackedPrice } from '../../utils/formatters'
import './ProductSearch.css'

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
  const [searchError, setSearchError] = useState(false)
  const debounceRef = useRef(null)
  const navigate = useNavigate()
  const listboxId = useId()

  useEffect(() => () => clearTimeout(debounceRef.current), [])

  const buildParams = (value) => {
    if (!value.trim()) return null
    if (searchType === 'url') return { url: value }
    if (searchType === 'website') return { website: value }
    return { search: value }
  }

  const runLookup = (value) => {
    clearTimeout(debounceRef.current)

    if (!value.trim()) {
      setResults([])
      setSearchError(false)
      setShowDropdown(false)
      setSearching(false)
      return
    }

    debounceRef.current = setTimeout(async () => {
      setSearching(true)
      setSearchError(false)
      try {
        const params = buildParams(value)
        const data = await getProducts({ ...params, size: 6 })
        setResults(data.content || [])
        setShowDropdown(true)
      } catch {
        setResults([])
        setSearchError(true)
        setShowDropdown(true)
      } finally {
        setSearching(false)
      }
    }, 400)
  }

  const handleChange = (value) => {
    setQuery(value)
    setActiveIndex(-1)
    runLookup(value)
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

  const handleKeyDown = (event) => {
    if (showDropdown && results.length > 0) {
      if (event.key === 'ArrowDown') {
        event.preventDefault()
        setActiveIndex((index) => Math.min(index + 1, results.length - 1))
        return
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault()
        setActiveIndex((index) => Math.max(index - 1, -1))
        return
      }
      if (event.key === 'Enter' && activeIndex >= 0) {
        event.preventDefault()
        handleSelect(results[activeIndex])
        return
      }
    }

    if (event.key === 'Enter' && onSearch) {
      setShowDropdown(false)
      onSearch(buildParams(query) || {})
    }

    if (event.key === 'Escape') {
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
            onChange={(event) => setSearchType(event.target.value)}
            className="search-select"
            aria-label="Search by"
          >
            <option value="all">All</option>
            <option value="url">URL</option>
            <option value="website">Website</option>
          </select>
        )}
        <input
          type="text"
          value={query}
          onChange={(event) => handleChange(event.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => results.length > 0 && setShowDropdown(true)}
          onBlur={() => setTimeout(() => {
            setShowDropdown(false)
            setActiveIndex(-1)
          }, 150)}
          placeholder={placeholder}
          aria-label="Search products"
          className="search-input"
          role="combobox"
          aria-expanded={showDropdown}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={activeIndex >= 0 ? `${listboxId}-opt-${activeIndex}` : undefined}
        />
        {showSearchButton && (
          <button onClick={handleSearchClick} className="search-button">
            Search
          </button>
        )}
      </div>

      {showDropdown && (
        <div className="search-dropdown" role="listbox" id={listboxId}>
          {searching && <p className="search-status">Searching...</p>}
          {!searching && searchError && (
            <p className="search-status">Search failed. Try again.</p>
          )}
          {!searching && !searchError && results.length === 0 && (
            <p className="search-status">No results found</p>
          )}
          {results.map((product, index) => {
            const added = existingIds.includes(product.id)
            return (
              <div
                key={product.id}
                id={`${listboxId}-opt-${index}`}
                role="option"
                aria-selected={activeIndex === index}
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
                    {formatPrice(getTrackedPrice(product), product.currency)}
                  </span>
                </div>
                {onSelect && (
                  <button
                    onMouseDown={(event) => {
                      event.stopPropagation()
                      handleSelect(product)
                    }}
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
