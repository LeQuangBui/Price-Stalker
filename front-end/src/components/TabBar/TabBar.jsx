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
  account: (
    <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4 20c0-3.3 3.6-6 8-6s8 2.7 8 6" />
  ),
}

const TABS = [
  { to: '/', label: 'Home', icon: 'home', end: true },
  { to: '/alerts', label: 'Alerts', icon: 'alerts', end: false },
  { to: '/bookmarks', label: 'Saved', icon: 'saved', end: false },
  // Header nav collapses to `md:flex` (Task 7), so /profile — and the sign-out
  // control that lives there (Task 8) — is otherwise unreachable on phones.
  { to: '/profile', label: 'Account', icon: 'account', end: false },
]

/**
 * Bottom tab navigation for phones. Hidden from `md` up, where Header carries the
 * same destinations. Renders nothing when signed out — every destination requires auth.
 */
export default function TabBar({ isSignedIn }) {
  if (!isSignedIn) return null

  // z-30, not z-40: Header is `sticky z-40`, which makes it a stacking context, so
  // NotificationBell's z-50 dropdown is trapped inside the header and competes with the
  // TabBar at the header's own level — later-in-DOM wins and the bar covers the dropdown's
  // last rows. z-30 still paints above unpositioned page content and stays below
  // CommandPalette's z-50 overlay.
  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-paper pb-safe-b md:hidden"
    >
      <ul className="mx-auto flex max-w-md">
        {TABS.map((tab) => (
          <li key={tab.to} className="flex-1">
            <NavLink
              to={tab.to}
              end={tab.end}
              className={({ isActive }) =>
                [
                  'flex h-tabbar min-h-tabbar flex-col items-center justify-center gap-1',
                  'font-meta text-[11px] font-semibold uppercase tracking-[0.08em]',
                  'transition-colors',
                  isActive ? 'text-oxblood' : 'text-ink-mute',
                ].join(' ')
              }
            >
              {({ isActive }) => (
                <>
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    width="22"
                    height="22"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={isActive ? 2.6 : 1.8}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    {ICONS[tab.icon]}
                  </svg>
                  {tab.label}
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
