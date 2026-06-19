import { apiRequest, buildQuery } from './client'

export function getAlerts(params = {}) {
  return apiRequest(`/alerts${buildQuery({
    page: params.page ?? 0,
    size: params.size ?? 20,
    sort: params.sort ?? 'createdAt',
    direction: params.direction ?? 'DESC'
  })}`)
}

export function getAlert(id) {
  return apiRequest(`/alerts/${id}`)
}

export function createAlert({ productId, thresholdPrice }) {
  return apiRequest('/alerts', {
    method: 'POST',
    body: { productId, thresholdPrice }
  })
}

export function updateAlert(id, { productId, thresholdPrice, active }) {
  return apiRequest(`/alerts/${id}`, {
    method: 'PUT',
    body: { productId, thresholdPrice, active }
  })
}

export function deleteAlert(id) {
  return apiRequest(`/alerts/${id}`, {
    method: 'DELETE'
  })
}

export async function findAlertForProduct(productId) {
  const data = await getAlerts({ page: 0, size: 200 })
  return data.content?.find((alert) => alert.product?.id === productId) || null
}
