import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { login, requestPasswordReset } from '../../api/auth'
import AppLink from '../../components/AppLink'
import AuthLayout from '../../components/Auth/AuthLayout'
import Field from '../../components/primitives/Field'

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
    <AuthLayout
      kicker="Welcome back"
      title="Log in"
      footer={<>Don&apos;t have an account? <AppLink to="/signup" className="font-semibold text-oxblood">Sign up</AppLink></>}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Field id="login-username" label="Username" type="text" value={username}
          onChange={(e) => setUsername(e.target.value)} required />
        <Field id="login-password" label="Password" type="password" value={password}
          onChange={(e) => setPassword(e.target.value)} required />
        {error && <p className="text-sm text-danger">{error}</p>}
        <button type="submit" className="btn btn-primary btn-lg btn-block" disabled={loading}>
          {loading ? 'Logging in…' : 'Log in'}
        </button>
      </form>

      <button
        type="button"
        className="mt-4 font-meta text-xs font-semibold uppercase tracking-[0.12em] text-ink-mute transition-colors hover:text-ink"
        onClick={() => {
          setShowResetForm((value) => !value)
          setResetMessage('')
        }}
      >
        {showResetForm ? 'Hide password reset' : 'Forgot password?'}
      </button>

      {showResetForm && (
        <form onSubmit={handlePasswordReset} className="mt-4 flex flex-col gap-4 border-t border-line pt-4">
          <Field id="login-reset-email" label="Account email" type="email" value={resetEmail}
            onChange={(e) => setResetEmail(e.target.value)} required />
          {resetMessage && (
            <p className={resetMessage.startsWith('If the account exists') ? 'text-sm text-forest' : 'text-sm text-danger'}>
              {resetMessage}
            </p>
          )}
          <button type="submit" className="btn btn-secondary btn-block" disabled={resetLoading}>
            {resetLoading ? 'Requesting…' : 'Request reset email'}
          </button>
        </form>
      )}
    </AuthLayout>
  )
}
