import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { signup } from '../../api/auth'
import AppLink from '../../components/AppLink'
import AuthLayout from '../../components/Auth/AuthLayout'
import Field from '../../components/primitives/Field'

export default function Signup() {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    email: '',
    confirmPassword: ''
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!formData.username || !formData.password || !formData.email) {
      setError('Username, email, and password are required')
      return
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)
    setError('')

    try {
      const data = await signup(formData.username, formData.password, formData.email)
      navigate(`/verify-email?email=${encodeURIComponent(data.email)}`)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (event) => {
    const { name, value } = event.target
    setFormData((prevData) => ({ ...prevData, [name]: value }))
  }

  return (
    <AuthLayout
      kicker="Get started"
      title="Create your account"
      subtitle="Free to start. No card required."
      footer={<>Already have an account? <AppLink to="/login" className="font-semibold text-oxblood">Log in</AppLink></>}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Field id="signup-username" label="Username" type="text" name="username"
          value={formData.username} onChange={handleChange} required />
        <Field id="signup-email" label="Email" type="email" name="email"
          value={formData.email} onChange={handleChange} required />
        <Field id="signup-password" label="Password" type="password" name="password"
          value={formData.password} onChange={handleChange} required />
        <Field id="signup-confirm-password" label="Confirm password" type="password" name="confirmPassword"
          value={formData.confirmPassword} onChange={handleChange} required />
        {error && <p className="text-sm text-danger">{error}</p>}
        <button type="submit" className="btn btn-primary btn-lg btn-block" disabled={loading}>
          {loading ? 'Creating account…' : 'Sign up'}
        </button>
      </form>
    </AuthLayout>
  )
}
