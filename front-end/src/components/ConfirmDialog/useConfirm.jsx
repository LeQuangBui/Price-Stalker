import { useCallback, useEffect, useRef, useState } from 'react'
import './ConfirmDialog.css'

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
    <dialog
      ref={dialogRef}
      className="confirm-dialog"
      onCancel={(event) => {
        event.preventDefault()
        settle(false)
      }}
      onClose={() => settle(false)}
    >
      {opts && (
        <div className="confirm-dialog-body">
          <h2 className="confirm-dialog-title">{opts.title}</h2>
          {opts.message && <p className="confirm-dialog-message">{opts.message}</p>}
          <div className="confirm-dialog-actions">
            <button type="button" className="confirm-dialog-cancel" onClick={() => settle(false)}>
              {opts.cancelLabel}
            </button>
            <button
              type="button"
              autoFocus
              className={`confirm-dialog-confirm${opts.danger ? ' danger' : ''}`}
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
