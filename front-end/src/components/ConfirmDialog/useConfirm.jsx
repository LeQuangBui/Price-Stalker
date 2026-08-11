import { useCallback, useEffect, useRef, useState } from 'react'
import { cx } from '../../lib/cx'

/**
 * Promise-based confirmation built on the native <dialog> element.
 *
 *   const [confirm, confirmDialog] = useConfirm()
 *   const ok = await confirm({ title: 'Delete this alert?', confirmLabel: 'Delete' })
 *   if (!ok) return
 *   ...render {confirmDialog} once in the component tree
 */
export function useConfirm() {
  const [opts, setOpts] = useState(null)
  const dialogRef = useRef(null)
  const resolverRef = useRef(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (opts && !dialog.open) {
      dialog.showModal()
    } else if (!opts && dialog.open) {
      dialog.close()
    }
  }, [opts])

  const settle = useCallback((result) => {
    const resolve = resolverRef.current
    resolverRef.current = null
    setOpts(null)
    if (resolve) {
      resolve(result)
    }
  }, [])

  const confirm = useCallback((options = {}) => {
    setOpts({
      title: options.title || 'Are you sure?',
      message: options.message || '',
      confirmLabel: options.confirmLabel || 'Confirm',
      cancelLabel: options.cancelLabel || 'Cancel',
      danger: options.danger !== false
    })
    return new Promise((resolve) => {
      resolverRef.current = resolve
    })
  }, [])

  const dialog = (
    // Native <dialog> via showModal(): it paints in the browser top layer, above every z-index and
    // outside every ancestor's overflow, which is why nothing here needs (or may add) a z-index.
    // `p-0` matters — the UA gives dialogs 1em of padding that preflight does not remove, and the
    // body below owns the spacing. The backdrop takes the shared `--scrim` token; the retired rule
    // said rgba(15,23,42,.45) while the gallery scrim says .55 — one overlay ink from here on,
    // which is the reason the token was minted.
    <dialog
      ref={dialogRef}
      className="m-auto w-[calc(100%-2rem)] max-w-[25rem] rounded-[var(--radius-lg)] border border-line bg-paper p-0 text-ink shadow-[var(--shadow-lg)] backdrop:bg-scrim"
      onCancel={(event) => {
        event.preventDefault()
        settle(false)
      }}
      onClose={() => settle(false)}
    >
      {opts && (
        <div className="p-6">
          <h2 className="mb-2 text-lg font-bold">{opts.title}</h2>
          {opts.message && <p className="mb-5 leading-normal text-ink-soft">{opts.message}</p>}
          <div className="flex justify-end gap-3">
            <button type="button" className="btn btn-secondary" onClick={() => settle(false)}>
              {opts.cancelLabel}
            </button>
            <button
              type="button"
              autoFocus
              // `btn` for the geometry (and the 44px floor the old 41px buttons missed), fills by
              // hand: the destructive confirm is a FILLED danger button, and `.btn-danger` is the
              // outline style — adopting it would invert the emphasis on a destructive action.
              // `--text-on-primary` has no bridge, hence the arbitrary var. brightness-95 is the
              // retired hover filter verbatim.
              className={cx(
                'btn border-transparent text-[var(--text-on-primary)] hover:brightness-95',
                opts.danger ? 'bg-danger' : 'bg-oxblood'
              )}
              onClick={() => settle(true)}
            >
              {opts.confirmLabel}
            </button>
          </div>
        </div>
      )}
    </dialog>
  )

  return [confirm, dialog]
}
