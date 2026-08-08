import AppLink from '../AppLink'
import NotificationBell from '../NotificationBell/NotificationBell'

// py-3 not py-2: text-sm is a 20px line box, so py-2 yields a 36px target. These links render
// from md up, which includes iPad portrait and other touch devices, so they need the full 44px.
const LINK = 'rounded-lg px-3 py-3 text-sm font-bold text-ink-soft transition-colors hover:bg-tertiary hover:text-oxblood'

export default function Header({ isSignedIn, theme, onToggleTheme }) {
  return (
    <header
      className="sticky top-4 z-40 mb-7 flex items-center justify-between rounded-2xl border border-line bg-paper px-4 py-3 sm:px-5"
      style={{ boxShadow: 'var(--shadow)' }}
    >
      <AppLink to="/" className="group flex items-center gap-3 text-ink no-underline transition-colors hover:text-oxblood">
        <span
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-oxblood font-display text-xl font-bold text-white"
          style={{ boxShadow: 'var(--shadow-sm)' }}
        >
          P
        </span>
        <div>
          <h1 className="m-0 font-display text-[22px] font-extrabold leading-[1.05] text-ink">
            Price<span className="text-oxblood">Stalker</span>
          </h1>
          <span className="hidden font-meta text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-mute sm:block">
            Track smarter
          </span>
        </div>
      </AppLink>

      <div className="flex items-center gap-2">
        {isSignedIn ? <NotificationBell /> : null}

        {/* Same label as TabBar deliberately. They are exact complements — this is `hidden md:flex`,
            TabBar is `md:hidden` — and `display: none` removes an element from the accessibility
            tree, so the two are never exposed at once. They are one navigation region rendered two
            ways, and naming the desktop one "Secondary" would imply a Primary that isn't there. */}
        <nav aria-label="Primary" className="hidden items-center gap-2 md:flex">
          {isSignedIn ? (
            <>
              <AppLink to="/profile" className={LINK}>Profile</AppLink>
              <AppLink to="/alerts" className={LINK}>Alerts</AppLink>
              <AppLink to="/bookmarks" className={LINK}>Bookmarks</AppLink>
            </>
          ) : (
            <>
              <AppLink to="/login" className={LINK}>Login</AppLink>
              <AppLink to="/signup" className={LINK}>Sign Up</AppLink>
            </>
          )}
        </nav>

        <button
          type="button"
          className="flex h-11 w-11 items-center justify-center rounded-lg border border-line bg-paper text-ink transition-colors hover:bg-tertiary"
          onClick={onToggleTheme}
          aria-pressed={theme === 'dark'}
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          <span aria-hidden="true">
            {theme === 'dark' ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" />
              </svg>
            )}
          </span>
        </button>
      </div>
    </header>
  )
}
