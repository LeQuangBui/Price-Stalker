import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { confirmPasswordReset } from '../../api/auth'
import AppLink from '../../components/AppLink'
import AuthLayout from '../../components/Auth/AuthLayout'
import Field from '../../components/primitives/Field'

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
      setMessage('Password updated. Redirecting to login…')
      window.setTimeout(() => navigate('/login'), 900)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout
      kicker="Reset"
      title="Set a new password"
      footer={<>Remembered it? <AppLink to="/login" className="font-semibold text-oxblood">Log in</AppLink></>}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Field id="reset-password" label="New password" type="password" value={password}
          onChange={(e) => setPassword(e.target.value)} required />
        <Field id="reset-confirm-password" label="Confirm new password" type="password" value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)} required />
        {message && <p className="text-sm text-forest">{message}</p>}
        {error && <p className="text-sm text-danger">{error}</p>}
        <button type="submit" className="btn btn-primary btn-lg btn-block" disabled={loading || !token}>
          {loading ? 'Saving…' : 'Save new password'}
        </button>
      </form>
    </AuthLayout>
  )
}
