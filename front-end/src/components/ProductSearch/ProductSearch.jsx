import { useEffect, useId, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getProducts } from '../../api/products'
import { formatPrice, getTrackedPrice } from '../../utils/formatters'

// The active option's tint, the retired `.search-dropdown-item:hover, .search-dropdown-item.active`
// value verbatim. Inline rather than an arbitrary background utility, and that is not a
// preference: Tailwind emits a SOLID pre-@supports fallback under an arbitrary color-mix — here
// solid --primary under dark row text — where the CSSOM refuses a value it cannot parse and
// degrades to no tint, legible either way. DropBadge.jsx and the product page's status pill made
// the same call.
//
// One mechanism for both input modes, on purpose. The retired file drew the tint twice — `:hover`
// in CSS, `.active` from state — and the two could disagree (keyboard moves the active row while
// the pointer parks on another: two rows lit). Every pointer path already funnels into
// setActiveIndex via onMouseEnter, so the state is the single source and this style follows it for
// mouse and aria-activedescendant alike. The hover:bg-tertiary on the row is the residual CSS
// half, kept deliberately narrow: it is the mix's own 90% base as a solid token (no fallback
// hazard), and it only ever shows where :hover is true but the state has not caught up — the
// sub-frame before React commits, or content scrolled under a parked pointer.
const ACTIVE_TINT = { background: 'color-mix(in srgb, var(--primary) 10%, var(--bg-tertiary))' }

const FIELD_RING = 'outline-none focus:border-oxblood focus:ring-2 focus:ring-oxblood/20'

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
    /* The root keeps `relative`: it is the containing block the absolute dropdown hangs its
       top/inset-x on, and the wall its z-[1000] cannot climb past — on Home the whole component
       sits inside `.search-layer` (relative z-40), the three-way contract with Header z-50 and
       TabBar z-40 that Home.jsx and both chrome files cite. */
    <div className="relative w-full">
      {/* The retired 768px media block, inverted mobile-first: the column is the default and the
          row arrives at md. Both states ride the SAME md: breakpoint — one token each side of one
          swap — so there is no width where neither applies when a raised root font moves the
          rem-measured breakpoint. */}
      <div className="flex flex-col flex-wrap gap-3 md:flex-row">
        {showSearchButton && (
          /* text-base where the retired rule read 15px: a real <select> under 16px force-zooms
             iOS Safari on focus — allowlisted since the input-zoom guard was written, fixed here,
             and the entry leaves in the same commit, emptying that guard's CSS allowlist. */
          <select
            value={searchType}
            onChange={(event) => setSearchType(event.target.value)}
            className={`cursor-pointer rounded-[var(--radius-sm)] border border-line bg-paper px-4 py-3 text-base text-ink shadow-[var(--shadow-sm)] transition-[border-color,box-shadow,background-color] duration-200 ${FIELD_RING}`}
            aria-label="Search by"
          >
            <option value="all">All</option>
            <option value="url">URL</option>
            <option value="website">Website</option>
          </select>
        )}
        {/* The px basis lives ONLY on the row variant. flex-basis is the MAIN axis, and the
            default state is a column: a bare 250px basis there is a 250px HEIGHT — a quarter of a
            phone screen of search box, which shipped once. In the column the input falls back to
            `flex: 0 1 auto` and the container's default stretch hands it the full width the
            retired `width: 100%` declared (the retired column state computed grow:1, moot in a
            content-sized column). Px deliberately, not rem: the basis exists to fit a VIEWPORT,
            and a rem basis grows with the reader while the viewport does not — the reasoning the
            retired file recorded at ProductSearch.css:32-39, kept here with the file gone.
            min-w-0 stays unconditional so the input can shrink once alone on a wrapped line
            instead of setting the page's scroll width.

            Focus: the ring is this input's only focus indicator (index.css's :focus-visible rule
            covers a / button / [role="button"], not inputs) — the Field pattern, with the delta
            2b-iii recorded: a 3px spread at 18% srgb becomes focus:ring-2 at 20% oklab. The
            transition keeps the retired three-property list, not transition-colors: the ring is a
            box-shadow and would otherwise pop in where it has always faded. */}
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
          className={`min-w-0 rounded-[var(--radius-sm)] border border-line bg-paper px-4 py-3 text-base text-ink shadow-[var(--shadow-sm)] transition-[border-color,box-shadow,background-color] duration-200 placeholder:text-ink-mute md:flex-[1_1_250px] ${FIELD_RING}`}
          role="combobox"
          aria-expanded={showDropdown}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={activeIndex >= 0 ? `${listboxId}-opt-${activeIndex}` : undefined}
        />
        {showSearchButton && (
          /* 15px is not a rem step and converts the way AddByUrl's button did: text-[0.9375rem],
             rem so it grows with the reader. Plain hover: — this button is never disabled. */
          <button
            onClick={handleSearchClick}
            className="cursor-pointer rounded-[var(--radius-sm)] border-none bg-oxblood px-6 py-3 text-[0.9375rem] font-semibold text-white transition-[background-color] duration-200 hover:bg-oxblood-deep"
          >
            Search
          </button>
        )}
      </div>

      {showDropdown && (
        /* z-[1000] is the retired z-index verbatim, and it is load-bearing: this is the value the
           `.search-layer` comments in Home.jsx, Header.jsx and TabBar.jsx all cite as the thing
           that layer exists to scope. The 16px radius is NOT a token — it is the same 16px the
           cards draw — so rounded-2xl (1rem, unshadowed by the :root radius keys) says it
           exactly, where the var(--radius…) sites use the arbitrary form. */
        <div
          className="absolute inset-x-0 top-[calc(100%_+_8px)] z-[1000] max-h-[400px] overflow-x-hidden overflow-y-auto rounded-2xl border border-line bg-surface shadow-[var(--shadow-lg)]"
          role="listbox"
          id={listboxId}
        >
          {searching && <p className="m-0 p-4 text-sm text-ink-soft">Searching...</p>}
          {!searching && searchError && (
            <p className="m-0 p-4 text-sm text-ink-soft">Search failed. Try again.</p>
          )}
          {!searching && !searchError && results.length === 0 && (
            <p className="m-0 p-4 text-sm text-ink-soft">No results found</p>
          )}
          {results.map((product, index) => {
            const added = existingIds.includes(product.id)
            return (
              <div
                key={product.id}
                id={`${listboxId}-opt-${index}`}
                role="option"
                aria-selected={activeIndex === index}
                className="flex cursor-pointer items-center gap-3.5 border-b border-line-soft px-4 py-3 transition-[background-color] duration-150 last:border-b-0 hover:bg-tertiary"
                style={activeIndex === index ? ACTIVE_TINT : undefined}
                onMouseEnter={() => setActiveIndex(index)}
                onMouseDown={() => handleSelect(product)}
              >
                {product.images?.[0] && (
                  /* The retired rule reached this element as a descendant selector
                     (`.search-dropdown-item img`); the classes now ride the element itself. */
                  <img
                    className="size-14 shrink-0 rounded-[var(--radius-sm)] border border-line-soft bg-tertiary object-cover"
                    src={product.images[0]}
                    alt={product.name}
                  />
                )}
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  {/* truncate is the retired nowrap-plus-ellipsis; the min-w-0 on the column is
                      what lets a long product name actually reach the ellipsis instead of setting
                      the row's min-content floor. */}
                  <span className="truncate text-sm font-medium text-ink">{product.name}</span>
                  <span className="text-sm font-bold text-success">
                    {formatPrice(getTrackedPrice(product), product.currency)}
                  </span>
                </div>
                {onSelect && (
                  /* Measured before the conversion: 65.1x32.8 — 6px pads plus a 13px line — under
                     the 44px floor, so min-h-11 joins the box, inline-flex centering the label.
                     13px reads text-xs, the standing call. enabled:hover: is the retired
                     :hover:not(:disabled) as variants, Pagination's spelling. */
                  <button
                    onMouseDown={(event) => {
                      event.stopPropagation()
                      handleSelect(product)
                    }}
                    disabled={added}
                    className="inline-flex min-h-11 shrink-0 cursor-pointer items-center justify-center whitespace-nowrap rounded-[var(--radius-sm)] border-none bg-oxblood px-3.5 py-1.5 text-xs font-semibold text-white transition-[background-color] duration-200 enabled:hover:bg-oxblood-deep disabled:cursor-not-allowed disabled:bg-tertiary disabled:text-ink-mute"
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
