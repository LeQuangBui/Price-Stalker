const BASE_URL = import.meta.env.VITE_API_URL

// Token management
export const getToken = () => localStorage.getItem('token')
export const setToken = (token) => localStorage.setItem('token', token)
export const removeToken = () => localStorage.removeItem('token')

// Helper to create headers with auth token
export const getHeaders = () => {
  const headers = {
    'Content-Type': 'application/json'
  }
  const token = getToken()
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  return headers
}

// Auth APIs
export async function login(username, password) {
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  })
  if (!res.ok) {
    const error = await res.text()
    throw new Error(error || 'Login failed')
  }
  const data = await res.json()
  setToken(data.token)
  return data
}

export async function signup(username, password, email) {
  const res = await fetch(`${BASE_URL}/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password, email })
  })
  if (!res.ok) {
    const error = await res.text()
    throw new Error(error || 'Signup failed')
  }
  const data = await res.json()
  setToken(data.token)
  return data
}

export function logout() {
  removeToken()
}

// User API
export async function getUserProfile() {
  const res = await fetch(`${BASE_URL}/users/me`, {
    headers: getHeaders()
  })
  if (!res.ok) {
    throw new Error('Failed to fetch user profile')
  }
  return res.json()
}
