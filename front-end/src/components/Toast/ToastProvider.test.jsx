import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ToastProvider, useToast } from './ToastProvider'

function Trigger() {
  const { toast } = useToast()
  return <button type="button" onClick={() => toast('Saved!', { type: 'success' })}>fire</button>
}

describe('ToastProvider', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('shows a toast then auto-dismisses after the duration', () => {
    render(
      <ToastProvider duration={1000}>
        <Trigger />
      </ToastProvider>
    )

    act(() => {
      fireEvent.click(screen.getByText('fire'))
    })
    expect(screen.getByText('Saved!')).toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(1100)
    })
    expect(screen.queryByText('Saved!')).not.toBeInTheDocument()
  })

  it('useToast outside a provider is a no-op (does not throw)', () => {
    expect(() => render(<Trigger />)).not.toThrow()
    fireEvent.click(screen.getByText('fire'))
  })
})
