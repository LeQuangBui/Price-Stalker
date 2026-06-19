import { Link, useNavigate } from 'react-router-dom'
import './Header.css'

export default function Header({ isSignedIn, onSignOut, theme, onToggleTheme }) {
  const navigate = useNavigate()

  const handleSignOut = () => {
    onSignOut()
    navigate('/')
  }

  return (
    <header className="header sticky top-4 z-40 rounded-2xl border border-[var(--border)] bg-[var(--bg-primary)] px-4 py-3 shadow-[var(--shadow)] sm:px-5">
      <Link to="/" className="header-title group">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--primary)] text-lg font-black text-white shadow-[var(--shadow-sm)]">
          P
        </span>
        <div>
          <h1>Price Stalker</h1>
          <span className="hidden text-xs font-semibold uppercase text-[var(--text-muted)] sm:block">
            Track smarter
          </span>
        </div>
      </Link>
      <nav className="header-nav">
        {isSignedIn ? (
          <>
            <Link to="/profile" className="header-link">
              Profile
            </Link>
            <Link to="/alerts" className="header-link">
              Alerts
            </Link>
            <Link to="/bookmarks" className="header-link">
              Bookmarks
            </Link>
            <button onClick={handleSignOut} className="signout-button" type="button">
              Sign Out
            </button>
          </>
        ) : (
          <>
            <Link to="/login" className="header-link">
              Login
            </Link>
            <Link to="/signup" className="header-link">
              Sign Up
            </Link>
          </>
        )}
        <button
          type="button"
          className="theme-toggle"
          onClick={onToggleTheme}
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
