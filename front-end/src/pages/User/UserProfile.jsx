import { useEffect, useState } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import { getUserProfile, isUnauthorizedError } from '../../api/auth'
import { formatDate } from '../../utils/formatters'
import NotificationSettings from '../../components/NotificationSettings/NotificationSettings'
import AppLink from '../../components/AppLink'
import Kicker from '../../components/primitives/Kicker'
import ErrorState from '../../components/primitives/ErrorState'
import './UserProfile.css'

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

  if (loading) {
    return (
      <div className="user-profile-container">
        <div className="skeleton" style={{ height: '32px', width: '40%', marginBottom: '20px' }} />
        <div className="skeleton" style={{ height: '160px' }} />
      </div>
    )
  }

  if (error) {
    return (
      <div className="user-profile-container">
        <ErrorState message={error} onRetry={() => setReloadKey((value) => value + 1)} />
      </div>
    )
  }

  if (!user) {
    return <div className="user-profile-container">No user data</div>
  }

  return (
    <div className="user-profile-container">
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

      <section className="mt-8 border-t border-line pt-6">
        <button
          type="button"
          className="btn btn-danger btn-block min-h-[44px]"
          onClick={() => {
            onSignOut()
            navigate('/')
          }}
        >
          Sign Out
        </button>
      </section>
    </div>
  )
}
