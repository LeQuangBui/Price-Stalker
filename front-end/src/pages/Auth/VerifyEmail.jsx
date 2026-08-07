import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { resendEmailVerification, verifyEmail } from '../../api/auth'
import AppLink from '../../components/AppLink'
import AuthLayout from '../../components/Auth/AuthLayout'
import Field from '../../components/primitives/Field'

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
    <AuthLayout
      kicker="Almost there"
      title="Verify your email"
      subtitle="Enter the 6-digit code we sent to your inbox."
      footer={<>Already verified? <AppLink to="/login" className="font-semibold text-oxblood">Log in</AppLink></>}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Field id="verify-email" label="Email" type="email" value={email}
          onChange={(e) => setEmail(e.target.value)} required />
        <Field id="verify-code" label="Verification code" type="text" inputMode="numeric" maxLength="6"
          value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} required />
        {message && <p className="text-sm text-forest">{message}</p>}
        {error && <p className="text-sm text-danger">{error}</p>}
        <button type="submit" className="btn btn-primary btn-lg btn-block" disabled={loading}>
          {loading ? 'Verifying…' : 'Verify email'}
        </button>
      </form>

      <button
        type="button"
        className="mt-4 font-meta text-xs font-semibold uppercase tracking-[0.12em] text-ink-mute transition-colors hover:text-ink disabled:opacity-60"
        onClick={handleResend}
        disabled={resending}
      >
        {resending ? 'Sending…' : 'Resend code'}
      </button>
    </AuthLayout>
  )
}
