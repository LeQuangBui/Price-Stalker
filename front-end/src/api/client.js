const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8080').replace(/\/$/, '')

let unauthorizedHandler = null

/**
 * Register a callback fired when an AUTHENTICATED request is rejected with 401 (an expired or
 * revoked session). The shell uses it to clear signed-in state + redirect, so stale signed-in
 * chrome can't linger after the session dies. Pass null to unregister.
 */
export function setUnauthorizedHandler(handler) {
  unauthorizedHandler = handler
}

export class ApiError extends Error {
  constructor(message, status, payload = null) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.payload = payload
  }
}

export function getToken() {
  return localStorage.getItem('token')
}

export function setToken(token) {
  localStorage.setItem('token', token)
}

export function removeToken() {
  localStorage.removeItem('token')
}

export function hasToken() {
  return !!getToken()
}

export function isUnauthorizedError(error) {
  return error instanceof ApiError && error.status === 401
}

export function buildQuery(params = {}) {
  const query = new URLSearchParams()

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') {
      return
    }
    query.append(key, value)
  })

  const queryString = query.toString()
  return queryString ? `?${queryString}` : ''
}

export async function apiRequest(path, options = {}) {
  const {
    method = 'GET',
    body,
    headers = {},
    auth = true,
    parse = true,
    suppressAuthRedirect = false,
    ...rest
  } = options

  const requestHeaders = { ...headers }
  const token = getToken()

  if (body !== undefined && !(body instanceof FormData) && !requestHeaders['Content-Type']) {
    requestHeaders['Content-Type'] = 'application/json'
  }

  if (auth && token) {
    requestHeaders.Authorization = `Bearer ${token}`
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: requestHeaders,
    body: body === undefined
      ? undefined
      : body instanceof FormData
        ? body
        : JSON.stringify(body),
    ...rest
  })

  const payload = parse ? await parseResponseBody(response) : null

  if (!response.ok) {
    // A 401 on a request we authenticated (had a token) means the session is dead — not a
    // login/credential failure (those use auth:false). Clear it and notify the app shell.
    // Background/indicator fetches pass suppressAuthRedirect so a probe the user never initiated
    // can't yank them to /login; the token is left intact so the next foreground request triggers
    // the real logout.
    if (response.status === 401 && auth && token && !suppressAuthRedirect) {
      removeToken()
      if (unauthorizedHandler) unauthorizedHandler()
    }
    throw new ApiError(extractErrorMessage(payload, response), response.status, payload)
  }

  if (response.status === 204 || !parse) {
    return null
  }

  return payload
}

async function parseResponseBody(response) {
  if (response.status === 204) {
    return null
  }

  const contentType = response.headers.get('content-type') || ''
  if (contentType.includes('application/json')) {
    return response.json()
  }

  const text = await response.text()
  return text || null
}

function extractErrorMessage(payload, response) {
  if (!payload) {
    return `${response.status} ${response.statusText}`.trim()
  }

  if (typeof payload === 'string') {
    return payload
  }

  if (typeof payload.message === 'string' && payload.message.trim()) {
    return payload.message
  }

  if (typeof payload.error === 'string' && payload.error.trim()) {
    return payload.error
  }

  return `${response.status} ${response.statusText}`.trim()
}
