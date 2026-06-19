import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { login, requestPasswordReset } from '../../api/auth'
import './Auth.css'

export default function Login({ onLogin }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [resetEmail, setResetEmail] = useState('')
  const [showResetForm, setShowResetForm] = useState(false)
  const [error, setError] = useState('')
  const [resetMessage, setResetMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [resetLoading, setResetLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!username || !password) {
      setError('Username and password are required')
      return
    }

    setLoading(true)
    setError('')
    setResetMessage('')

    try {
      const data = await login(username, password)
      onLogin(data.username)
      navigate('/')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handlePasswordReset = async (event) => {
    event.preventDefault()
    if (!resetEmail) {
      setResetMessage('Email is required')
      return
    }

    setResetLoading(true)
    setResetMessage('')

    try {
      await requestPasswordReset(resetEmail)
      setResetMessage('If the account exists, a reset email has been queued.')
    } catch (err) {
      setResetMessage(err.message)
    } finally {
      setResetLoading(false)
    }
  }

  return (
    <div className="auth-container">
      <h2>Login</h2>
      <form onSubmit={handleSubmit} className="auth-form">
        <div className="form-group">
          <label className="form-label">Username</label>
          <input
            type="text"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            required
            className="form-input"
          />
        </div>
        <div className="form-group">
          <label className="form-label">Password</label>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            className="form-input"
          />
        </div>
        {error && <p className="form-error">{error}</p>}
        <button type="submit" className="form-button" disabled={loading}>
          {loading ? 'Logging in...' : 'Login'}
        </button>
      </form>

      <button
        type="button"
        className="auth-secondary-button"
        onClick={() => {
          setShowResetForm((value) => !value)
          setResetMessage('')
        }}
      >
        {showResetForm ? 'Hide password reset' : 'Forgot password?'}
      </button>

      {showResetForm && (
        <form onSubmit={handlePasswordReset} className="auth-form auth-secondary-form">
          <div className="form-group">
            <label className="form-label">Account email</label>
            <input
              type="email"
              value={resetEmail}
              onChange={(event) => setResetEmail(event.target.value)}
              required
              className="form-input"
            />
          </div>
          {resetMessage && (
            <p className={resetMessage.startsWith('If the account exists') ? 'form-info' : 'form-error'}>
              {resetMessage}
            </p>
          )}
          <button type="submit" className="form-button" disabled={resetLoading}>
            {resetLoading ? 'Requesting...' : 'Request reset email'}
          </button>
        </form>
      )}

      <p className="auth-footer">
        Don&apos;t have an account? <Link to="/signup">Sign up</Link>
      </p>
    </div>
  )
}
