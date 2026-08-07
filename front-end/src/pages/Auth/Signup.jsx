import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { signup } from '../../api/auth'
import './Auth.css'

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
    <div className="auth-container">
      <h2>Sign Up</h2>
      <form onSubmit={handleSubmit} className="auth-form">
        <div className="form-group">
          <label className="form-label" htmlFor="signup-username">Username</label>
          <input
            id="signup-username"
            type="text"
            name="username"
            value={formData.username}
            onChange={handleChange}
            required
            className="form-input"
          />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="signup-email">Email</label>
          <input
            id="signup-email"
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
            className="form-input"
          />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="signup-password">Password</label>
          <input
            id="signup-password"
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            required
            className="form-input"
          />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="signup-confirm-password">Confirm Password</label>
          <input
            id="signup-confirm-password"
            type="password"
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleChange}
            required
            className="form-input"
          />
        </div>
        {error && <p className="form-error">{error}</p>}
        <button type="submit" className="form-button" disabled={loading}>
          {loading ? 'Creating account...' : 'Sign Up'}
        </button>
      </form>
      <p className="auth-footer">
        Already have an account? <Link to="/login">Login</Link>
      </p>
    </div>
  )
}
