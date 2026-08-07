import { apiRequest, buildQuery } from './client'

export function getBookmarks(params = {}) {
  return apiRequest(`/bookmarks${buildQuery({
    page: params.page ?? 0,
    size: params.size ?? 20,
    sort: params.sort ?? 'createdAt',
    direction: params.direction ?? 'DESC'
  })}`)
}

export function getBookmark(id) {
  return apiRequest(`/bookmarks/${id}`)
}

export function createBookmark({ name, productIds = [] }) {
  return apiRequest('/bookmarks', {
    method: 'POST',
    body: { name, productIds }
  })
}

export function updateBookmark(id, { name, productIds = [] }) {
  return apiRequest(`/bookmarks/${id}`, {
    method: 'PUT',
    body: { name, productIds }
  })
}

export function deleteBookmark(id) {
  return apiRequest(`/bookmarks/${id}`, {
    method: 'DELETE'
  })
}
