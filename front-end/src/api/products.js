import { apiRequest, buildQuery } from './client'

export async function getProducts(params = {}) {
  return apiRequest(`/products${buildQuery({
    search: params.search,
    url: params.url,
    website: params.website,
    page: params.page ?? 0,
    size: params.size ?? 20,
    sort: params.sort ?? 'createdAt',
    direction: params.direction ?? 'DESC'
  })}`, { auth: false })
}

export function getProduct(id) {
  return apiRequest(`/products/${id}`, { auth: false })
}

export function createProductExtraction(url) {
  // Sends the auth token: the backend gates POST /products/extractions to signed-in users
  // (anti-abuse — anonymous URL submission to the crawler is no longer allowed).
  return apiRequest('/products/extractions', {
    method: 'POST',
    body: { url }
  })
}

export function getProductExtraction(requestId) {
  // Sends the auth token: the backend now scopes extraction status to the owner,
  // so the SPA poll must carry the token to read its own request.
  return apiRequest(`/products/extractions/${requestId}`)
}

export function createProductByUrl(url) {
  return createProductExtraction(url)
}

export async function getPriceHistory(productId, timeRange = '1d') {
  const now = new Date()
  let after = null

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
      break
    default:
      after = new Date(now.getTime() - 24 * 60 * 60 * 1000)
  }

  return apiRequest(`/products/${productId}/price-histories${buildQuery({
    after: after ? after.toISOString().replace('Z', '') : undefined
  })}`, { auth: false })
}
