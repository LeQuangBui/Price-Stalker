import { useEffect, useRef, useState } from 'react'
import { createBookmark, getBookmarks, updateBookmark } from '../../api/bookmarks'

// The status line, shared by four branches (Loading, empty list, success, error). One base so the
// branches cannot drift apart; each branch appends its own ink, never two colors on one element —
// two color utilities on the same element would leave the winner to emit order in the bundle.
const STATUS = 'm-0 p-4 text-center text-sm'

// One rule dressed both row buttons in the retired stylesheet ("Add"/"Added" per row and
// "Create and Save" below), so one constant keeps dressing both. Measured before the conversion:
// 42.4px tall — 10px pads plus a 14px line at the body's 1.6 — under the 44px floor, so min-h-11
// joins the box it replaces, with inline-flex centering the label inside the taller box.
// text-white where the retired rule read var(--text-on-primary): the token is unbridged and
// defines itself as #ffffff in both themes ("white reads on both themes", index.css:41).
const ROW_ACTION =
  'inline-flex min-h-11 cursor-pointer items-center justify-center rounded-[var(--radius-sm)] ' +
  'border-none bg-oxblood px-3.5 py-2.5 text-sm font-semibold text-white ' +
  'disabled:cursor-not-allowed disabled:bg-tertiary disabled:text-ink-mute'

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
    /* The root keeps `relative`: it is the containing block the absolute dropdown below hangs
       its top/inset-x on. Drop it and the dropdown resolves against the page instead. */
    <div className="relative" ref={dropdownRef}>
      {/* The retired rule's `transition: all .2s` animates everything the hover changes —
          background, color AND box-shadow — so the conversion is the bare `transition` group,
          which carries all three. `transition-colors` would leave the shadow popping in over a
          hover that has always faded it. */}
      <button
        className="w-full cursor-pointer rounded-[var(--radius-sm)] border-2 border-oxblood bg-paper px-7 py-3.5 text-base font-semibold text-oxblood transition duration-200 hover:bg-oxblood hover:text-white hover:shadow-[var(--shadow)]"
        onClick={() => setOpen((value) => !value)}
        type="button"
      >
        Save to Bookmark
      </button>

      {open && (
        /* z-[100] is the retired z-index verbatim, scoped under Home's three-way contract the
           same way ProductSearch's dropdown is — the overlay outranks page content, not the
           Header/TabBar chrome. The radius is the token, in arbitrary form: the unlayered :root
           shadows Tailwind's radius keys, so a named step here (rounded-lg reads 12px, not
           Tailwind's .5rem) can never say 8px. */
        <div className="absolute inset-x-0 top-[calc(100%_+_8px)] z-[100] max-h-[420px] overflow-x-hidden overflow-y-auto rounded-[var(--radius)] border border-line bg-paper shadow-[var(--shadow-lg)]">
          {/* 13px is not a rem step: the title reads text-xs, the call the product page's pill
              made and AddByUrl's status row repeated. */}
          <p className="m-0 border-b border-line-soft px-4 py-3 text-xs font-semibold uppercase text-ink-mute">
            Choose a bookmark
          </p>
          {loading && <p className={`${STATUS} text-ink-soft`}>Loading...</p>}

          {!loading && (
            <div className="flex flex-col gap-2.5 border-b border-line-soft p-4">
              <p className="m-0 text-xs font-bold uppercase text-ink-mute">Existing bookmarks</p>
              {bookmarks.length === 0 && (
                <p className={`${STATUS} text-ink-soft`}>No bookmarks yet. Create one below.</p>
              )}
              {bookmarks.map((bookmark) => {
                const alreadyAdded = isProductInBookmark(bookmark)
                const isSaving = savingBookmarkId === bookmark.id

                return (
                  <div
                    key={bookmark.id}
                    className="flex items-center justify-between gap-3 rounded-[var(--radius-sm)] border border-line bg-ground px-3.5 py-3"
                  >
                    <div className="flex min-w-0 flex-col gap-1">
                      <span className="text-sm font-semibold text-ink">{bookmark.name}</span>
                      <span className="text-xs text-ink-soft">
                        {bookmark.products?.length || 0} products
                      </span>
                    </div>
                    <button
                      type="button"
                      className={ROW_ACTION}
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

          <form className="flex flex-col gap-2.5 p-4" onSubmit={handleCreate}>
            <label className="m-0 text-xs font-bold uppercase text-ink-mute" htmlFor="bookmark-name-input">
              Create a new bookmark
            </label>
            {/* text-base where the retired rule read 14px: a real input under 16px force-zooms iOS
                Safari on focus, allowlisted since the guard was written and fixed here — the
                allowlist entry leaves in the same commit. text-ink / bg-paper are the 2b-ii
                re-homing, kept: Bookmarks.css was the only declarer of this field's ink and
                ground, and losing them again would hand the ink back to preflight and the ground
                to whatever the dropdown paints. The focus ring converts to the Field pattern with
                the delta 2b-iii recorded: a 3px spread at 18% srgb becomes focus:ring-2 at 20%
                oklab — 1px thinner, two points stronger, mixed in a different space. */}
            <input
              id="bookmark-name-input"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Bookmark name"
              className="w-full rounded-[var(--radius-sm)] border border-line bg-paper px-3.5 py-3 text-base text-ink outline-none focus:border-oxblood focus:ring-2 focus:ring-oxblood/20"
            />
            <button type="submit" className={ROW_ACTION} disabled={creating}>
              {creating ? 'Saving...' : 'Create and Save'}
            </button>
          </form>

          {success && <p className={`${STATUS} text-success-deep`}>{success}</p>}
          {/* The error branch keeps the box 2b-ii re-homed onto this component — background,
              border, radius. Those three used to come from UserProfile.css's `.no-bookmarks,
              .error` rule plus its `.error` override, matched via the bare `error` token from a
              stylesheet this component's page never imports; the re-homing made them this
              element's own, and the conversion keeps them its own as utilities. The padding needs
              no re-homing here either: STATUS's p-4 is the 16px the base rule always set. */}
          {error && (
            <p className={`${STATUS} rounded-[var(--radius)] border border-danger bg-paper text-danger`}>
              {error}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
