import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { resendEmailVerification, verifyEmail } from '../../api/auth'
import './Auth.css'

export default function VerifyEmail({ onVerified }) {
  const [searchParams] = useSearchParams()
  const [email, setEmail] = useState(searchParams.get('email') || '')
  const [code, setCode] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!email || !code) {
      setError('Email and verification code are required')
      return
    }

    setLoading(true)
    setError('')
    setMessage('')

    try {
      await verifyEmail(email, code)
      onVerified()
      navigate('/')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    if (!email) {
      setError('Email is required')
      return
    }

    setResending(true)
    setError('')
    setMessage('')

    try {
      await resendEmailVerification(email)
      setMessage('A new verification code has been queued.')
    } catch (err) {
      setError(err.message)
    } finally {
      setResending(false)
    }
  }

  return (
    <div className="auth-container">
      <h2>Verify Email</h2>
      <form onSubmit={handleSubmit} className="auth-form">
        <div className="form-group">
          <label className="form-label" htmlFor="verify-email">Email</label>
          <input
            id="verify-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            className="form-input"
          />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="verify-code">Verification code</label>
          <input
            id="verify-code"
            type="text"
            inputMode="numeric"
            maxLength="6"
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
            required
            className="form-input"
          />
        </div>
        {message && <p className="form-info">{message}</p>}
        {error && <p className="form-error">{error}</p>}
        <button type="submit" className="form-button" disabled={loading}>
          {loading ? 'Verifying...' : 'Verify email'}
        </button>
      </form>

      <button type="button" className="auth-secondary-button" onClick={handleResend} disabled={resending}>
        {resending ? 'Sending...' : 'Resend code'}
      </button>

      <p className="auth-footer">
        Already verified? <Link to="/login">Login</Link>
      </p>
    </div>
  )
}
