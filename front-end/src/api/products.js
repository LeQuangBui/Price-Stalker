import { getHeaders } from './auth'

const BASE_URL = import.meta.env.VITE_API_URL

export async function getProducts(params = {}) {
  const { search, url, website, page = 0, size = 20, sort = 'createdAt', direction = 'DESC' } = params

  const queryParams = new URLSearchParams()
  if (search) queryParams.append('search', search)
  if (url) queryParams.append('url', url)
  if (website) queryParams.append('website', website)
  queryParams.append('page', page)
  queryParams.append('size', size)
  queryParams.append('sort', sort)
  queryParams.append('direction', direction)

  const res = await fetch(`${BASE_URL}/products?${queryParams}`, {
    headers: getHeaders()
  })
  if (!res.ok) throw new Error('Failed to fetch products')
  return res.json()
}

export async function getProduct(id) {
  const res = await fetch(`${BASE_URL}/products/${id}`, {
    headers: getHeaders()
  })
  if (!res.ok) throw new Error('Failed to fetch product')
  return res.json()
}

export async function createProductByUrl(url) {
  const res = await fetch(`${BASE_URL}/products`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ url })
  })
  if (!res.ok) {
    const error = await res.text()
    throw new Error(error || 'Failed to create product')
  }
  return res.json()
}

export async function getPriceHistory(productId, timeRange = '1d') {
  const now = new Date()
  let after = null
  let all = false

  switch (timeRange) {
    case '1d':
      after = new Date(now.getTime() - 24 * 60 * 60 * 1000)
      break
    case '5d':
      after = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000)
      break
    case '1m':
      after = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      break
    case '6m':
      after = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000)
      break
    case '1y':
      after = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
      break
    case 'all':
      all = true
      break
    default:
      after = new Date(now.getTime() - 24 * 60 * 60 * 1000)
  }

  const body = {
    productId,
    all
  }

  if (after) {
    body.after = after.toISOString()
  }

  const res = await fetch(`${BASE_URL}/products/${productId}/price-histories`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(body)
  })
  if (!res.ok) throw new Error('Failed to fetch price history')
  return res.json()
}
