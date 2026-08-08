import { NavLink } from 'react-router-dom'

const ICONS = {
  home: (
    <path d="M3 10.5 12 3l9 7.5M5.5 9.5V20h13V9.5" />
  ),
  alerts: (
    <path d="M18 8a6 6 0 1 0-12 0c0 6-2 7-2 7h16s-2-1-2-7M13.7 20a2 2 0 0 1-3.4 0" />
  ),
  saved: (
    <path d="M6 3h12a1 1 0 0 1 1 1v16l-7-4-7 4V4a1 1 0 0 1 1-1Z" />
  ),
}

const TABS = [
  { to: '/', label: 'Home', icon: 'home', end: true },
  { to: '/alerts', label: 'Alerts', icon: 'alerts', end: false },
  { to: '/bookmarks', label: 'Saved', icon: 'saved', end: false },
]

/**
 * Bottom tab navigation for phones. Hidden from `md` up, where Header carries the
 * same destinations. Renders nothing when signed out — every destination requires auth.
 */
export default function TabBar({ isSignedIn }) {
  if (!isSignedIn) return null

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-paper pb-safe-b md:hidden"
    >
      <ul className="mx-auto flex max-w-md">
        {TABS.map((tab) => (
          <li key={tab.to} className="flex-1">
            <NavLink
              to={tab.to}
              end={tab.end}
              className={({ isActive }) =>
                [
                  'flex h-tabbar min-h-[3.5rem] flex-col items-center justify-center gap-1',
                  'font-meta text-[11px] font-semibold uppercase tracking-[0.08em]',
                  'transition-colors',
                  isActive ? 'text-oxblood' : 'text-ink-mute',
                ].join(' ')
              }
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                width="22"
                height="22"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                {ICONS[tab.icon]}
              </svg>
              {tab.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
