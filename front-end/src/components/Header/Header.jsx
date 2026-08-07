import { useNavigate } from 'react-router-dom'
import AppLink from '../AppLink'
import NotificationBell from '../NotificationBell/NotificationBell'
import './Header.css'

export default function Header({ isSignedIn, onSignOut, theme, onToggleTheme }) {
  const navigate = useNavigate()

  const handleSignOut = () => {
    onSignOut()
    navigate('/')
  }

  return (
    <header
      className="header sticky top-4 z-40 rounded-2xl border border-line bg-paper px-4 py-3 sm:px-5"
      style={{ boxShadow: 'var(--shadow)' }}
    >
      <AppLink to="/" className="header-title group">
        <span
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-oxblood font-display text-xl font-bold text-white"
          style={{ boxShadow: 'var(--shadow-sm)' }}
        >
          P
        </span>
        <div>
          <h1 className="font-display">
            Price<span className="text-oxblood">Stalker</span>
          </h1>
          <span className="hidden font-meta text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-mute sm:block">
            Track smarter
          </span>
        </div>
      </AppLink>
      <nav className="header-nav">
        {isSignedIn ? (
          <>
            <NotificationBell />
            <AppLink to="/profile" className="header-link">Profile</AppLink>
            <AppLink to="/alerts" className="header-link">Alerts</AppLink>
            <AppLink to="/bookmarks" className="header-link">Bookmarks</AppLink>
            <button onClick={handleSignOut} className="signout-button" type="button">
              Sign Out
            </button>
          </>
        ) : (
          <>
            <AppLink to="/login" className="header-link">Login</AppLink>
            <AppLink to="/signup" className="header-link">Sign Up</AppLink>
          </>
        )}
        <button
          type="button"
          className="theme-toggle"
          onClick={onToggleTheme}
          aria-pressed={theme === 'dark'}
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          <span aria-hidden="true" className="theme-toggle-icon">
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
      </nav>
    </header>
  )
}
