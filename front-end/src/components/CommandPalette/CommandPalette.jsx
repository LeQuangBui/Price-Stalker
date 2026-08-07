import { useEffect, useState } from 'react'
import { Command } from 'cmdk'

/**
 * ⌘K / Ctrl+K command palette (cmdk — accessible combobox semantics). Lives in
 * the app shell so the global key listener is always mounted. Jump-to-page now;
 * product search wires in during the page-migration phases.
 */
export default function CommandPalette({ onNavigate }) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onKey = (event) => {
      if ((event.metaKey || event.ctrlKey) && (event.key === 'k' || event.key === 'K')) {
        event.preventDefault()
        setOpen((value) => !value)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  const go = (to) => {
    setOpen(false)
    onNavigate(to)
  }

  return (
    <Command.Dialog
      open={open}
      onOpenChange={setOpen}
      label="Command palette"
      overlayClassName="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
      contentClassName="fixed left-1/2 top-24 z-50 w-[min(560px,calc(100vw-2rem))] -translate-x-1/2 overflow-hidden rounded-2xl border border-line bg-paper shadow-2xl"
    >
      <Command.Input
        placeholder="Search or jump to…"
        className="w-full border-b border-line bg-transparent px-4 py-4 font-meta text-base text-ink outline-none placeholder:text-ink-mute"
      />
      <Command.List className="max-h-80 overflow-y-auto p-2">
        <Command.Empty className="px-3 py-6 text-center text-sm text-ink-mute">
          No results.
        </Command.Empty>
        <Command.Group heading="Go to">
          <PaletteItem value="home" onSelect={() => go('/')}>Home</PaletteItem>
          <PaletteItem value="alerts" onSelect={() => go('/alerts')}>Alerts</PaletteItem>
          <PaletteItem value="bookmarks" onSelect={() => go('/bookmarks')}>Bookmarks</PaletteItem>
          <PaletteItem value="profile" onSelect={() => go('/profile')}>Profile</PaletteItem>
        </Command.Group>
      </Command.List>
    </Command.Dialog>
  )
}

function PaletteItem({ children, value, onSelect }) {
  return (
    <Command.Item
      value={value}
      onSelect={onSelect}
      className="flex cursor-pointer items-center rounded-lg px-3 py-2.5 text-sm text-ink data-[selected=true]:bg-ground"
    >
      {children}
    </Command.Item>
  )
}
