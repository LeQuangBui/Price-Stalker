import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { confirmPasswordReset, signup, verifyEmail } from './auth'

function jsonResponse(body, status = 200) {
  return Promise.resolve(new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' }
  }))
}

function createLocalStorageMock() {
  const store = new Map()

  return {
    getItem: vi.fn((key) => store.get(key) ?? null),
    setItem: vi.fn((key, value) => store.set(key, String(value))),
    removeItem: vi.fn((key) => store.delete(key)),
    clear: vi.fn(() => store.clear())
  }
}

describe('auth api', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', createLocalStorageMock())
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('signup posts credentials without storing a token', async () => {
    globalThis.fetch.mockReturnValueOnce(jsonResponse({ message: 'Verification email queued' }))

    const data = await signup('hung', 'secret', 'hung@example.com')

    expect(data).toEqual({ message: 'Verification email queued' })
    expect(globalThis.localStorage.getItem('token')).toBeNull()
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'http://localhost:8080/auth/signup',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'hung',
          password: 'secret',
          email: 'hung@example.com'
        })
      })
    )
  })

  it('verifyEmail stores the returned JWT token', async () => {
    globalThis.fetch.mockReturnValueOnce(jsonResponse({ token: 'jwt-token' }))

    const data = await verifyEmail('hung@example.com', '123456')

    expect(data).toEqual({ token: 'jwt-token' })
    expect(globalThis.localStorage.getItem('token')).toBe('jwt-token')
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'http://localhost:8080/auth/email-verification/verify',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'hung@example.com',
          code: '123456'
        })
      })
    )
  })

  it('confirmPasswordReset posts token and new password without parsing a response body', async () => {
    globalThis.fetch.mockReturnValueOnce(Promise.resolve(new Response(null, { status: 204 })))

    const data = await confirmPasswordReset('reset-token', 'new-secret')

    expect(data).toBeNull()
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'http://localhost:8080/auth/password-reset/confirm',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: 'reset-token',
          newPassword: 'new-secret'
        })
      })
    )
  })
})
