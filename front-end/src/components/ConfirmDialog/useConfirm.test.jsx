import { render, screen, fireEvent, act } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useConfirm } from './useConfirm'

// Drives the hook through a real consumer, the way every page uses it. The <dialog> itself is
// jsdom's, patched by the setup.js stub (jsdom 26 ships no showModal/close).
function Harness({ onResult, options }) {
  const [confirm, confirmDialog] = useConfirm()
  return (
    <>
      <button type="button" onClick={async () => onResult(await confirm(options))}>
        open
      </button>
      {confirmDialog}
    </>
  )
}

async function openDialog(options) {
  const results = []
  render(<Harness onResult={(value) => results.push(value)} options={options} />)
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'open' }))
  })
  return results
}

describe('useConfirm', () => {
  it('resolves true when the confirm action is pressed', async () => {
    const results = await openDialog({ title: 'Delete this alert?', confirmLabel: 'Delete' })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
    })
    expect(results).toEqual([true])
  })

  it('resolves false when cancel is pressed', async () => {
    const results = await openDialog({ cancelLabel: 'Keep it' })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Keep it' }))
    })
    expect(results).toEqual([false])
  })

  it('resolves false when the dialog itself cancels, as Escape does', async () => {
    const results = await openDialog({})
    await act(async () => {
      fireEvent(screen.getByRole('dialog'), new Event('cancel', { cancelable: true }))
    })
    expect(results).toEqual([false])
  })

  it('falls back to the stock title and labels', async () => {
    await openDialog({})
    expect(screen.getByRole('heading', { name: 'Are you sure?' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Confirm' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
  })

  it('omits the message paragraph when no message is given', async () => {
    await openDialog({ title: 'Sure?' })
    const dialog = screen.getByRole('dialog')
    expect(dialog.querySelector('p')).toBeNull()
  })
})
