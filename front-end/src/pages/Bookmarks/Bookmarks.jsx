import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
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
import AppLink from '../../components/AppLink'
import Kicker from '../../components/primitives/Kicker'
import Pagination from '../../components/primitives/Pagination'
import ErrorState from '../../components/primitives/ErrorState'
import EmptyState from '../../components/primitives/EmptyState'
import OrDivider from '../../components/primitives/OrDivider'

// A px cap, like the shell's own max-w-[1400px]. A cap does not gate content against a rem-sized
// box the way a breakpoint does — it only stops the measure getting too long — so it does not need
// to grow with the reader.
const PAGE = 'mx-auto max-w-[1200px]'

// One column on phones, deliberately. Forced two-up leaves an 85px card interior at 320px and the
// old `.expand-btn` alone measured 88.7px, so the second column overflows before it renders; the
// card also grew from 278px tall to 351px because the name wraps to three lines. `xl:` restores the
// 3-up that `repeat(auto-fill, minmax(380px, 1fr))` gave from a 1180px container — the page caps at
// 1200px, so that was every viewport from 1280px up. `md:` turns 768-827px from one wide card into
// two ~350px cards, which is a real change and an accepted one.
//
// `grid-cols-1` rather than a bare `1fr` track is load-bearing, not stylistic: Tailwind compiles it
// to `repeat(1, minmax(0, 1fr))`, and the `0` is what stops an expanded card's min-content — a
// nowrap URL in AddByUrl's status row — setting the page's scroll width. Measured at 606px against
// a 390px viewport before this changed. Never hand-write the old track as an arbitrary value: it
// brings back both bugs and the width guard cannot see either.
export const BOOKMARKS_GRID = 'grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3'

// The thumb box, shared by the <img> and the "No image" placeholder. Bookmarks.css set it once for
// both in a grouped selector; utilities cannot reach an unclassed <img>, so the group had to be
// split across two elements and this constant is what stops the halves drifting. The placeholder's
// own rule never restated the box, so splitting it wrong loses the placeholder's dimensions.
//
// 4.25rem, not 68px — the same size at the default font, but it has to be rem because what it
// clips is rem. The label inside it is `text-xs` with `p-2`, and at a 24px browser default that is
// 18px type and 12px padding: 72px of content in a frozen 68px box, which overflows rather than
// wraps. Box and content share a unit or one of them eventually cuts the other off.
const PREVIEW_THUMB = 'h-[4.25rem] w-[4.25rem] shrink-0 rounded-[var(--radius-sm)]'

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
      <div className={PAGE}>
        <p className="sr-only" role="status">Loading bookmarks…</p>
        <div className={BOOKMARKS_GRID} aria-hidden="true">
          {Array.from({ length: 4 }).map((_, index) => (
            // The 16px radius deliberately overrides the layered `.skeleton`'s var(--radius-sm),
            // exactly as `.bookmark-card-skeleton` did: index.css keeps `.skeleton` inside
            // `@layer base`, so an unlayered utility outranks it whatever the specificity.
            <div key={index} className="skeleton h-[200px] rounded-2xl" />
          ))}
        </div>
      </div>
    )
  }
  if (error && bookmarks.length === 0) {
    return (
      <div className={PAGE}>
        <ErrorState message={error} onRetry={fetchBookmarks} />
      </div>
    )
  }

  return (
    <div className={PAGE}>
      {confirmDialog}
      <Kicker>Collections</Kicker>
      <div className="mb-7 flex flex-col items-start gap-5 md:flex-row md:justify-between">
        <div>
          {/* No `style={{ margin: 0 }}`: Tailwind's preflight already zeroes every element's
              margin, and index.css sets no margin on h1. Same for the subtitle below. */}
          <h1 className="font-display text-display-sm font-semibold text-ink">My bookmarks</h1>
          <p className="text-ink-soft">
            Group products to watch together. Add by search or by pasting a URL, then save the list.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          {bookmarks.length > 0 && (
            <button onClick={toggleCollapseAll} className="btn btn-secondary" type="button">
              {allCollapsed ? 'Expand All' : 'Collapse All'}
            </button>
          )}
          <button
            onClick={() => setShowCreateForm((value) => !value)}
            className="btn btn-primary"
            type="button"
          >
            {showCreateForm ? 'Cancel' : 'New Bookmark'}
          </button>
        </div>
      </div>

      {showCreateForm && (
        <form
          onSubmit={handleCreateBookmark}
          className="mb-7 flex flex-col gap-3 rounded-2xl border border-line bg-surface p-5 shadow-[var(--shadow-sm)] md:flex-row"
        >
          {/* No `bookmark-name-input` class. AddToBookmark.css owned that name and, while it
              lived, won on this element — 14px, which is why the input used to force-zoom despite
              Bookmarks.css declaring 15. Keeping the name as a styling hook would have handed the
              input to a stylesheet this page never imports, with every guard green; that file
              retired later in 2b-iv, which is exactly why the hook had to go rather than lean on
              it.

              The focus utilities are the other half of that class. AddToBookmark.css's
              `.bookmark-name-input:focus` was drawing this field's ring, and index.css's
              :focus-visible rule only covers a / button / [role="button"] — a bare <input> would
              be left with the UA default outline. This is the house string from Field.jsx, which
              rings 2px at 20% where the leak rang 3px at 18%. No `transition-colors`:
              `focus:ring-2` is a box-shadow and transition-colors does not animate it. */}
          <input
            type="text"
            value={newBookmarkName}
            onChange={(event) => setNewBookmarkName(event.target.value)}
            placeholder="Bookmark name"
            className="w-full rounded-[var(--radius-sm)] border border-line bg-paper px-4 py-3 text-base text-ink outline-none placeholder:text-ink-mute focus:border-oxblood focus:ring-2 focus:ring-oxblood/20 md:flex-1"
            autoFocus
          />
          <button type="submit" className="btn btn-primary w-full md:w-auto">Create</button>
        </form>
      )}

      {error && bookmarks.length > 0 && <p className="mb-4 text-danger">{error}</p>}

      {bookmarks.length === 0 ? (
        <EmptyState
          title="No bookmarks yet"
          action={
            <button type="button" className="btn btn-primary" onClick={() => setShowCreateForm(true)}>
              New Bookmark
            </button>
          }
        >
          Bookmarks group products you want to watch together. Create one, then add products by search or by pasting a URL.
        </EmptyState>
      ) : (
        <>
          <div className={BOOKMARKS_GRID}>
            {bookmarks.map((bookmark) => {
              const draft = drafts[bookmark.id] || cloneBookmark(bookmark)
              const isCollapsed = collapsedIds.has(bookmark.id)
              const dirty = hasUnsavedChanges(bookmark.id)
              const isSaving = savingBookmarkId === bookmark.id

              return (
                <section
                  key={bookmark.id}
                  className="rounded-2xl border border-line bg-surface p-6 shadow-[var(--shadow)]"
                >
                  {/* lg:, not md:. md: is where the grid halves this card — a derived interior of
                      302px at 768px against 430px at 1024 — so switching these internals to a row
                      at md: would put the row layout exactly where the box is narrowest in the
                      ladder. */}
                  <div className="mb-[18px] flex flex-col items-start gap-4 lg:flex-row lg:items-stretch lg:justify-between">
                    <div>
                      {/* h2, not h3. Every state of this page went h1 straight to h3, and the
                          card title is the only thing under the page heading — there is no level
                          for it to be nested inside. The tag was expensive to change while
                          `Bookmarks.css` keyed rules to it; it does not any more. `.empty-state h3`
                          in index.css still does, which is why the shared empty state keeps its
                          own level. */}
                      <h2 className="mb-2.5 text-[1.375rem]">{bookmark.name}</h2>
                      {/* A wrapping row, unchanged by this commit: `flex-direction: column` used to
                          reach it from UserProfile.css through the shared `bookmark-info` name, and
                          left with that file one commit ago. The utilities below are a 1:1 of what
                          `.bookmark-info` declares today. */}
                      <div className="flex flex-wrap gap-3 text-sm text-ink-soft">
                        <span className="font-bold text-oxblood">{draft.products.length} products</span>
                        <span>Created {formatDate(bookmark.createdAt)}</span>
                        {dirty && <span className="font-bold text-danger">Unsaved changes</span>}
                      </div>
                    </div>

                    <div className="flex flex-col items-start gap-2.5 lg:flex-row lg:flex-wrap">
                      <button
                        type="button"
                        onClick={() => handleToggleCollapse(bookmark.id)}
                        className="btn btn-secondary"
                      >
                        {isCollapsed ? 'Expand' : 'Collapse'}
                      </button>
                      {/* 16px -> 14px, and intended. `.delete-btn` was the one button on this page
                          Bookmarks.css never gave a `font-size` to — the five-selector group at the
                          top of the file covered Create, Collapse, Submit, Save and Expand, and
                          Delete was not in it — so it inherited body 16px. `.btn` is 14px, which is
                          the house size every other control here was already using. `.remove-product-btn`
                          below is the same story and the same call. This is the only value in the
                          conversion that moved, so it is noted rather than left to be found. */}
                      <button
                        onClick={() => handleDelete(bookmark.id)}
                        className="btn btn-danger"
                        title="Delete bookmark"
                        type="button"
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  {!isCollapsed && (
                    <>
                      <div className="mb-[18px] flex flex-col gap-3.5">
                        <div className="flex flex-col gap-3 rounded-xl border border-line-soft bg-tertiary p-4">
                          <ProductSearch
                            placeholder="Search products to add..."
                            existingIds={draft.products.map((product) => product.id)}
                            onSelect={(product) => handleProductSelect(bookmark.id, product)}
                          />
                          <OrDivider>or paste a URL</OrDivider>
                          <AddByUrl onAdded={(product) => handleProductSelect(bookmark.id, product)} />
                        </div>

                        {/* `justify-start` is the old media block's `justify-content: stretch`,
                            which a flex container resolves as flex-start. The full-width Save it
                            paired with is on the button, and both switch at lg: with the rest of
                            the card internals. */}
                        <div className="flex justify-start lg:justify-end">
                          <button
                            type="button"
                            className="btn btn-primary w-full lg:w-auto"
                            onClick={() => handleSave(bookmark.id)}
                            disabled={!dirty || isSaving}
                          >
                            {isSaving ? 'Saving...' : 'Save'}
                          </button>
                        </div>
                      </div>

                      {draft.products.length > 0 ? (
                        <div className="flex flex-col gap-3">
                          {draft.products.map((product) => (
                            <div
                              key={product.id}
                              className="flex flex-col items-start gap-3 rounded-[var(--radius-sm)] border border-line-soft bg-[color-mix(in_srgb,var(--bg-secondary)_78%,var(--bg-primary))] p-3 hover:border-[var(--primary-light)] lg:flex-row lg:items-center"
                            >
                              {/* `min-w-0` here and on the info column lets the row shrink below
                                  its children's natural width. It is necessary and not sufficient:
                                  min-w-0 raises no min-content floor of its own, but it cannot
                                  lower the one the TEXT sets — see the price span below. */}
                              <AppLink
                                to={`/products/${product.id}`}
                                className="flex min-w-0 flex-1 items-center gap-3 text-inherit no-underline"
                              >
                                {getPrimaryImage(product) ? (
                                  <img
                                    src={getPrimaryImage(product)}
                                    alt={product.name}
                                    className={`${PREVIEW_THUMB} object-cover`}
                                  />
                                ) : (
                                  <div className={`${PREVIEW_THUMB} flex items-center justify-center bg-tertiary p-2 text-center text-xs text-ink-mute`}>
                                    No image
                                  </div>
                                )}

                                <div className="flex min-w-0 flex-1 flex-col justify-center gap-1.5">
                                  {/* `wrap-anywhere` here too, and it took a realistic fixture to
                                      see it. A product name is a long run of short words, so its
                                      min-content is one word wide and usually harmless — but real
                                      shelf names carry model numbers, and this column's floor is
                                      the widest of the two lines in it. At 68 characters this span
                                      is 137.19px and its link is the widest element in `<main>`. */}
                                  <span className="font-semibold text-ink wrap-anywhere">{product.name}</span>
                                  {/* Not PriceDisplay. Its smallest step is 16px and its value span
                                      is hard-coded text-ink; this is a sub-24px green line with one
                                      consumer, and neither a new size nor an overridable colour is
                                      worth adding to the primitive for it.

                                      `wrap-anywhere` because a formatted price is one unbreakable
                                      run of digits and separators, and its min-content width is one
                                      of this row's two floors — not the only one, as this note
                                      first claimed. That reading came from the test fixture's
                                      "Espresso Machine", 16 characters and no token longer than
                                      eight, which cannot floor anything; ablating the name span
                                      changed nothing because there was nothing to ablate.

                                      Re-measured at 320px / 24px browser default with a 68-character
                                      name and the header ablated, since the header pins the page at
                                      394 whatever these two do (see the carry-forward doc). Against
                                      a 305px client: 337px with the name unwrapped, 336px with it
                                      wrapped, 305px — an exact fit — once `.add-by-url-input`'s
                                      `min-width: 250px` goes too. The two mask each other almost
                                      exactly, which is why fixing either alone moves the page by a
                                      pixel and looks like it did nothing. AddByUrl is slice 2b-iv.

                                      `anywhere` and not `break-word`: only `anywhere` feeds break
                                      opportunities into intrinsic sizing, which is the whole
                                      mechanism here. Third price span in this phase to need it. */}
                                  <span className="font-bold text-success wrap-anywhere">
                                    {formatPrice(getTrackedPrice(product), product.currency)}
                                  </span>
                                </div>
                              </AppLink>

                              {/* 16px -> 14px, same call as Delete above. */}
                              <button
                                type="button"
                                className="btn btn-danger"
                                onClick={() => handleProductRemove(bookmark.id, product.id)}
                              >
                                Remove
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="rounded-2xl border border-dashed border-line bg-surface p-5 text-ink-soft">
                          Add products above, then click Save.
                        </p>
                      )}
                    </>
                  )}
                </section>
              )
            })}
          </div>

          <Pagination
            page={page}
            totalPages={totalPages}
            onPrev={() => setPage((value) => Math.max(0, value - 1))}
            onNext={() => setPage((value) => value + 1)}
          />
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
