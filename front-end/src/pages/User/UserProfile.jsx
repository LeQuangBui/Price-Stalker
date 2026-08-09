import { useEffect, useState } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import { getUserProfile, isUnauthorizedError } from '../../api/auth'
import { formatDate } from '../../utils/formatters'
import NotificationSettings from '../../components/NotificationSettings/NotificationSettings'
import AppLink from '../../components/AppLink'
import Kicker from '../../components/primitives/Kicker'
import ErrorState from '../../components/primitives/ErrorState'
import './UserProfile.css'

/**
 * Sign Out is the app's ONLY sign-out control (the header's was retired in Phase 1), so it
 * must survive every state this page can land in. If it only rendered on the success branch,
 * any non-401 failure of GET /users/me — backend 500, offline, CORS, malformed payload —
 * would strand the user in a session they cannot leave. Rendered outside the state switch, so
 * it is present in the loading, error, empty and loaded states alike.
 */
function SignOutSection({ onSignOut, navigate }) {
  return (
    <section className="mt-8 border-t border-line pt-6">
      <button
        type="button"
        className="btn btn-danger btn-block"
        onClick={() => {
          onSignOut()
          navigate('/')
        }}
      >
        Sign Out
      </button>
    </section>
  )
}

export default function UserProfile() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)
  const navigate = useNavigate()
  const { onSignOut } = useOutletContext()

  useEffect(() => {
    const fetchUserProfile = async () => {
      setLoading(true)
      setError('')
      try {
        const data = await getUserProfile()
        setUser(data)
      } catch (err) {
        setError(err.message)
        if (isUnauthorizedError(err)) {
          navigate('/login')
        }
      } finally {
        setLoading(false)
      }
    }

    fetchUserProfile()
  }, [navigate, reloadKey])

  let body
  if (loading) {
    body = (
      <>
        <div className="skeleton" style={{ height: '32px', width: '40%', marginBottom: '20px' }} />
        <div className="skeleton" style={{ height: '160px' }} />
      </>
    )
  } else if (error) {
    body = <ErrorState message={error} onRetry={() => setReloadKey((value) => value + 1)} />
  } else if (!user) {
    body = 'No user data'
  } else {
    body = <ProfileBody user={user} />
  }

  // One return with a switched body — not four early returns. Keeping SignOutSection at a
  // fixed position in the tree means it is the same DOM node in every state, so it never
  // unmounts (or flickers) as the fetch settles or is retried.
  return (
    <div className="user-profile-container">
      {body}
      <SignOutSection onSignOut={onSignOut} navigate={navigate} />
    </div>
  )
}

function ProfileBody({ user }) {
  return (
    <>
      <Kicker>Account</Kicker>
      <h1 className="font-display text-display-sm font-semibold text-ink" style={{ marginTop: '12px', marginBottom: '24px' }}>
        Your profile
      </h1>

      <div className="profile-section">
        <div className="profile-item">
          <span className="profile-label">Username:</span>
          <span className="profile-value">{user.username}</span>
        </div>

        <div className="profile-item">
          <span className="profile-label">Email:</span>
          <span className="profile-value">{user.email}</span>
        </div>

        <div className="profile-item">
          <span className="profile-label">Member since:</span>
          <span className="profile-value">{formatDate(user.createdAt)}</span>
        </div>
      </div>

      <div className="profile-actions">
        <AppLink to="/bookmarks" className="profile-action-link">View Bookmarks</AppLink>
        <AppLink to="/alerts" className="profile-action-link">Manage Alerts</AppLink>
      </div>

      <div className="profile-section">
        <NotificationSettings />
      </div>

      <div className="bookmarks-section">
        <h3>Bookmarks ({user.bookmarks?.length || 0})</h3>
        {user.bookmarks && user.bookmarks.length > 0 ? (
          <div className="bookmarks-list">
            {user.bookmarks.map((bookmark) => (
              <div key={bookmark.id} className="bookmark-item">
                <div className="bookmark-info">
                  <span className="bookmark-name">{bookmark.name || 'Unnamed'}</span>
                  <span className="bookmark-date">
                    Created {formatDate(bookmark.createdAt)}
                  </span>
                  <span className="bookmark-date">
                    {bookmark.products?.length || 0} products
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="no-bookmarks">No bookmarks yet.</p>
        )}
      </div>

    </>
  )
}
