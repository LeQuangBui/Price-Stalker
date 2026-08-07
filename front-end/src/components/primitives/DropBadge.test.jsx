import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import DropBadge from './DropBadge'

describe('DropBadge', () => {
  it('shows a down badge for a price drop', () => {
    render(<DropBadge oldPrice={100} newPrice={88} />)
    expect(screen.getByText(/▼\s*12\.0%/)).toBeInTheDocument()
  })

  it('shows an up badge for a price rise', () => {
    render(<DropBadge oldPrice={100} newPrice={108} />)
    expect(screen.getByText(/▲\s*8\.0%/)).toBeInTheDocument()
  })

  it('renders nothing for invalid input', () => {
    const { container } = render(<DropBadge oldPrice={0} newPrice={10} />)
    expect(container).toBeEmptyDOMElement()
  })
})
