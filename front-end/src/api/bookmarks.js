import { getHeaders } from './auth'

const BASE_URL = import.meta.env.VITE_API_URL

export async function getBookmarks(params = {}) {
  const { page = 0, size = 20, sort = 'createdAt', direction = 'DESC' } = params

  const queryParams = new URLSearchParams()
  queryParams.append('page', page)
  queryParams.append('size', size)
  queryParams.append('sort', sort)
  queryParams.append('direction', direction)

  const res = await fetch(`${BASE_URL}/bookmarks/me?${queryParams}`, {
    headers: getHeaders()
  })
  if (!res.ok) throw new Error('Failed to fetch bookmarks')
  return res.json()
}

export async function getBookmark(id) {
  const res = await fetch(`${BASE_URL}/bookmarks/${id}`, {
    headers: getHeaders()
  })
  if (!res.ok) throw new Error('Failed to fetch bookmark')
  return res.json()
}

export async function createBookmark(name, productIds = []) {
  const res = await fetch(`${BASE_URL}/bookmarks`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ name, productIds })
  })
  if (!res.ok) throw new Error('Failed to create bookmark')
  return res.json()
}

export async function deleteBookmark(id) {
  const res = await fetch(`${BASE_URL}/bookmarks/${id}`, {
    method: 'DELETE',
    headers: getHeaders()
  })
  if (!res.ok) throw new Error('Failed to delete bookmark')
}

export async function addProductToBookmark(bookmarkId, productId) {
  const res = await fetch(`${BASE_URL}/bookmarks/${bookmarkId}/products/${productId}`, {
    method: 'POST',
    headers: getHeaders()
  })
  if (!res.ok) throw new Error('Failed to add product to bookmark')
  return res.json()
}

export async function removeProductFromBookmark(bookmarkId, productId) {
  const res = await fetch(`${BASE_URL}/bookmarks/${bookmarkId}/products/${productId}`, {
    method: 'DELETE',
    headers: getHeaders()
  })
  if (!res.ok) throw new Error('Failed to remove product from bookmark')
}
