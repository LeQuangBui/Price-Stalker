const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8080').replace(/\/$/, '')

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
