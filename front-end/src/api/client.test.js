import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { apiRequest, setUnauthorizedHandler } from './client'

function jsonResponse(status) {
  return Promise.resolve(
    new Response(status === 204 ? null : JSON.stringify({ message: 'nope' }), {
      status,
      headers: { 'content-type': 'application/json' },
    })
  )
}

function createLocalStorageMock(initial = {}) {
  const store = new Map(Object.entries(initial))
  return {
    getItem: vi.fn((key) => store.get(key) ?? null),
    setItem: vi.fn((key, value) => store.set(key, String(value))),
    removeItem: vi.fn((key) => store.delete(key)),
    clear: vi.fn(() => store.clear()),
  }
}

describe('apiRequest 401 session handling', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    setUnauthorizedHandler(null)
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('fires the unauthorized handler and clears the token on a 401 for an authenticated request', async () => {
    const ls = createLocalStorageMock({ token: 'jwt' })
    vi.stubGlobal('localStorage', ls)
    const handler = vi.fn()
    setUnauthorizedHandler(handler)
    globalThis.fetch.mockReturnValueOnce(jsonResponse(401))

    await expect(apiRequest('/me')).rejects.toMatchObject({ status: 401 })

    expect(handler).toHaveBeenCalledTimes(1)
    expect(ls.removeItem).toHaveBeenCalledWith('token')
  })

  it('does NOT fire the handler for an unauthenticated request (auth:false) — e.g. a failed login', async () => {
    vi.stubGlobal('localStorage', createLocalStorageMock())
    const handler = vi.fn()
    setUnauthorizedHandler(handler)
    globalThis.fetch.mockReturnValueOnce(jsonResponse(401))

    await expect(apiRequest('/auth/login', { auth: false })).rejects.toMatchObject({ status: 401 })

    expect(handler).not.toHaveBeenCalled()
  })
})
