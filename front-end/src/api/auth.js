import {
  apiRequest,
  getToken,
  hasToken,
  isUnauthorizedError,
  removeToken,
  setToken
} from './client'

export async function login(username, password) {
  const data = await apiRequest('/auth/login', {
    method: 'POST',
    auth: false,
    body: { username, password }
  })
  setToken(data.token)
  return data
}

export function signup(username, password, email) {
  return apiRequest('/auth/signup', {
    method: 'POST',
    auth: false,
    body: { username, password, email }
  })
}

export async function verifyEmail(email, code) {
  const data = await apiRequest('/auth/email-verification/verify', {
    method: 'POST',
    auth: false,
    body: { email, code }
  })
  setToken(data.token)
  return data
}

export function resendEmailVerification(email) {
  return apiRequest('/auth/email-verification/resend', {
    method: 'POST',
    auth: false,
    body: { email }
  })
}

export function requestPasswordReset(email) {
  return apiRequest('/auth/password-reset/request', {
    method: 'POST',
    auth: false,
    body: { email }
  })
}

export function confirmPasswordReset(token, newPassword) {
  return apiRequest('/auth/password-reset/confirm', {
    method: 'POST',
    auth: false,
    parse: false,
    body: { token, newPassword }
  })
}

export function logout() {
  removeToken()
}

export function getUserProfile() {
  return apiRequest('/users/me')
}

export { getToken, hasToken, isUnauthorizedError }
