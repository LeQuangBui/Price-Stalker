import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import OrDivider from './OrDivider'

describe('OrDivider', () => {
  it('renders its label', () => {
    render(<OrDivider>or paste a URL</OrDivider>)
    expect(screen.getByText(/or paste a URL/i)).toBeVisible()
  })

  // The two hairlines are the divider. They are symmetrical pseudo-elements, so the failure mode is
  // writing one of them and not noticing — nothing else in the tree would go red.
  it('draws a rule on both sides of the label', () => {
    const { container } = render(<OrDivider>or</OrDivider>)
    const cls = container.firstChild.className
    for (const utility of ['before:flex-1', 'before:h-px', 'after:flex-1', 'after:h-px']) {
      expect(cls, `${utility} missing — the divider is lopsided`).toContain(utility)
    }
  })

  it('composes an extra className', () => {
    const { container } = render(<OrDivider className="mt-4">or</OrDivider>)
    expect(container.firstChild.className).toContain('mt-4')
  })
})
