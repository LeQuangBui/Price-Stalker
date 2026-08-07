import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import CommandPalette from './CommandPalette'

describe('CommandPalette', () => {
  it('is closed until Cmd/Ctrl+K, then navigates on select', async () => {
    const onNavigate = vi.fn()
    render(<CommandPalette onNavigate={onNavigate} />)

    expect(screen.queryByText('Bookmarks')).not.toBeInTheDocument()

    fireEvent.keyDown(document, { key: 'k', ctrlKey: true })

    const item = await screen.findByText('Bookmarks')
    fireEvent.click(item)

    expect(onNavigate).toHaveBeenCalledWith('/bookmarks')
  })
})
