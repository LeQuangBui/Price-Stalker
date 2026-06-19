import { Link, useNavigate } from 'react-router-dom'
import './Header.css'

export default function Header({ isSignedIn, onSignOut, theme, onToggleTheme }) {
  const navigate = useNavigate()

  const handleSignOut = () => {
    onSignOut()
    navigate('/')
  }

  return (
    <header className="header sticky top-4 z-40 rounded-2xl border border-[var(--border)] bg-[var(--bg-primary)]/86 px-4 py-3 shadow-[var(--shadow)] backdrop-blur-xl sm:px-5">
      <Link to="/" className="header-title group">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[linear-gradient(135deg,var(--primary),var(--accent))] text-lg font-black text-white shadow-[var(--shadow-sm)]">
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
          <span aria-hidden="true">{theme === 'dark' ? '☀' : '☾'}</span>
        </button>
      </nav>
    </header>
  )
}
