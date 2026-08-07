import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  deleteSubscription,
  getVapidPublicKey,
  saveSubscription,
  sendTestPush,
  urlBase64ToUint8Array,
} from './push'

function jsonResponse(body, status = 200) {
  return Promise.resolve(new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  }))
}

function emptyResponse(status = 204) {
  return Promise.resolve(new Response(null, { status }))
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

describe('urlBase64ToUint8Array', () => {
  it('decodes a base64url string to the right bytes', () => {
    expect(Array.from(urlBase64ToUint8Array('AQID'))).toEqual([1, 2, 3])
  })

  it('restores missing padding', () => {
    expect(Array.from(urlBase64ToUint8Array('AQ'))).toEqual([1])
  })

  it('maps the url-safe alphabet (- and _) back to + and /', () => {
    // base64url "_-8" -> base64 "_-8=" -> "/+8=" -> bytes [0xFF, 0xEF]
    expect(Array.from(urlBase64ToUint8Array('_-8'))).toEqual([0xff, 0xef])
  })
})

describe('push api', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', createLocalStorageMock({ token: 'jwt-token' }))
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('getVapidPublicKey returns the key and does not send auth', async () => {
    globalThis.fetch.mockReturnValueOnce(jsonResponse({ publicKey: 'PUBKEY' }))

    const key = await getVapidPublicKey()

    expect(key).toBe('PUBKEY')
    const [, options] = globalThis.fetch.mock.calls[0]
    expect(globalThis.fetch.mock.calls[0][0]).toBe('http://localhost:8080/push/vapid-public-key')
    expect(options.headers.Authorization).toBeUndefined()
  })

  it('saveSubscription posts endpoint + keys from the subscription', async () => {
    globalThis.fetch.mockReturnValueOnce(emptyResponse(204))
    const subscription = {
      toJSON: () => ({
        endpoint: 'https://push.example.com/ep',
        keys: { p256dh: 'P256', auth: 'AUTH' },
      }),
    }

    const result = await saveSubscription(subscription)

    expect(result).toBeNull()
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'http://localhost:8080/push/subscriptions',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          Authorization: 'Bearer jwt-token',
        }),
        body: JSON.stringify({
          endpoint: 'https://push.example.com/ep',
          keys: { p256dh: 'P256', auth: 'AUTH' },
        }),
      })
    )
  })

  it('saveSubscription rejects an incomplete subscription without calling the server', async () => {
    const subscription = {
      toJSON: () => ({ endpoint: 'https://push.example.com/ep', keys: { p256dh: 'P256' } }), // no auth
    }

    await expect(saveSubscription(subscription)).rejects.toThrow(/complete push subscription/i)
    expect(globalThis.fetch).not.toHaveBeenCalled()
  })

  it('deleteSubscription sends the endpoint in the body', async () => {
    globalThis.fetch.mockReturnValueOnce(emptyResponse(204))

    await deleteSubscription('https://push.example.com/ep')

    expect(globalThis.fetch).toHaveBeenCalledWith(
      'http://localhost:8080/push/subscriptions',
      expect.objectContaining({
        method: 'DELETE',
        body: JSON.stringify({ endpoint: 'https://push.example.com/ep' }),
      })
    )
  })

  it('sendTestPush posts to /push/test', async () => {
    globalThis.fetch.mockReturnValueOnce(emptyResponse(202))

    await sendTestPush()

    expect(globalThis.fetch).toHaveBeenCalledWith(
      'http://localhost:8080/push/test',
      expect.objectContaining({ method: 'POST' })
    )
  })
})
