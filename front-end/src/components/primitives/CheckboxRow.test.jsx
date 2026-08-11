import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import CheckboxRow from './CheckboxRow'

const noop = () => {}

describe('CheckboxRow', () => {
  it('labels the checkbox with its children', () => {
    render(<CheckboxRow checked={false} onChange={noop}>Active</CheckboxRow>)
    expect(screen.getByRole('checkbox', { name: 'Active' })).toBeInTheDocument()
  })

  it('reflects the checked prop', () => {
    render(<CheckboxRow checked onChange={noop}>Active</CheckboxRow>)
    expect(screen.getByRole('checkbox')).toBeChecked()
  })

  // The label IS the target — this is what makes a 44px label a 44px touch target for a 13px box.
  it('toggles from a click on the label text', async () => {
    const onChange = vi.fn()
    render(<CheckboxRow checked={false} onChange={onChange}>Active</CheckboxRow>)
    await userEvent.click(screen.getByText('Active'))
    expect(onChange).toHaveBeenCalled()
  })

  // The whole reason the primitive exists. Both hand-rolled originals were under the floor — 42px
  // on Alerts, a measured 25.59px on the product page — and nothing in the suite enforces 44px, so
  // a component with no test for its own floor is one careless edit away from being under it again.
  it('carries the 44px touch floor', () => {
    const { container } = render(<CheckboxRow checked={false} onChange={noop}>Active</CheckboxRow>)
    expect(container.firstChild.className.split(/\s+/)).toContain('min-h-11')
  })

  // Alerts hangs a native tooltip off this control, and a rewrite is exactly where that goes
  // missing.
  it('passes extra props through to the label', () => {
    render(<CheckboxRow checked={false} onChange={noop} title="paused when off">Active</CheckboxRow>)
    expect(screen.getByTitle('paused when off')).toBeInTheDocument()
  })
})
