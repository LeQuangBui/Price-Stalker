import { apiRequest, buildQuery } from './client'

/**
 * Recent in-app notifications for the logged-in user — one entry per price-drop event
 * (the server collapses the email + push rows by event_id). Returns an array of
 * { eventId, productId, productName, productUrl, sentAt }.
 */
export async function getNotifications({ size = 20, suppressAuthRedirect = false } = {}) {
  const data = await apiRequest(`/notifications${buildQuery({ size })}`, { suppressAuthRedirect })
  return Array.isArray(data) ? data : []
}
