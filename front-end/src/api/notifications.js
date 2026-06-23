import { apiRequest, buildQuery } from './client'

/**
 * Recent in-app notifications for the logged-in user — one entry per price-drop event
 * (the server collapses the email + push rows by event_id). Returns an array of
 * { eventId, productId, productName, productUrl, sentAt }.
 */
export async function getNotifications({ size = 20 } = {}) {
  const data = await apiRequest(`/notifications${buildQuery({ size })}`)
  return Array.isArray(data) ? data : []
}
