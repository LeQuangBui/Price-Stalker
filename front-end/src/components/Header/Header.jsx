import { Link, useNavigate } from 'react-router-dom'
import './Header.css'

export default function Header({ isSignedIn, onSignOut }) {
  const navigate = useNavigate()

  const handleSignOut = () => {
    onSignOut()
    navigate('/')
  }

  return (
    <header className="header">
      <Link to="/" className="header-title">
        <h1>Price Stalker</h1>
      </Link>
      <nav className="header-nav">
        {isSignedIn ? (
          <>
            <Link to="/profile" className="user-icon" title="Profile">
              👤
            </Link>
            <Link to="/bookmarks" className="header-link">
              Bookmarks
            </Link>
            <button onClick={handleSignOut} className="signout-button">
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
      </nav>
    </header>
  )
}
