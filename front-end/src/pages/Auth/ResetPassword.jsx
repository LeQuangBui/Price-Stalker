import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { confirmPasswordReset } from '../../api/auth'
import './Auth.css'

export default function ResetPassword() {
  const [searchParams] = useSearchParams()
  const [token] = useState(searchParams.get('token') || '')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!token) {
      setError('Reset token is missing')
      return
    }
    if (!password) {
      setError('New password is required')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)
    setError('')
    setMessage('')

    try {
      await confirmPasswordReset(token, password)
      setMessage('Password updated. Redirecting to login...')
      window.setTimeout(() => navigate('/login'), 900)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-container">
      <h2>Reset Password</h2>
      <form onSubmit={handleSubmit} className="auth-form">
        <div className="form-group">
          <label className="form-label" htmlFor="reset-password">New password</label>
          <input
            id="reset-password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            className="form-input"
          />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="reset-confirm-password">Confirm new password</label>
          <input
            id="reset-confirm-password"
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            required
            className="form-input"
          />
        </div>
        {message && <p className="form-info">{message}</p>}
        {error && <p className="form-error">{error}</p>}
        <button type="submit" className="form-button" disabled={loading || !token}>
          {loading ? 'Saving...' : 'Save new password'}
        </button>
      </form>
      <p className="auth-footer">
        Remembered it? <Link to="/login">Login</Link>
      </p>
    </div>
  )
}
