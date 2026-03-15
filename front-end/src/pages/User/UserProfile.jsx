import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getUserProfile } from '../../api/auth'
import './UserProfile.css'

export default function UserProfile() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const data = await getUserProfile()
        setUser(data)
      } catch (err) {
        setError(err.message)
        if (err.message.includes('401') || err.message.includes('Unauthorized')) {
          navigate('/login')
        }
      } finally {
        setLoading(false)
      }
    }

    fetchUserProfile()
  }, [navigate])

  if (loading) {
    return <div className="user-profile-container">Loading...</div>
  }

  if (error) {
    return <div className="user-profile-container error">{error}</div>
  }

  if (!user) {
    return <div className="user-profile-container">No user data</div>
  }

  return (
    <div className="user-profile-container">
      <h2>User Profile</h2>

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
          <span className="profile-value">
            {new Date(user.createdAt).toLocaleDateString()}
          </span>
        </div>
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
                    Added: {new Date(bookmark.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="no-bookmarks">No bookmarks yet</p>
        )}
      </div>
    </div>
  )
}
