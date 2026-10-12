import type { ReservationDetail } from './travel-api'

/** Revenue is the first verified capture, including deposits, not the unpaid balance. */
export function verifiedPurchaseEvent(reservation: ReservationDetail) {
  const capture = reservation.analytics_purchase
  if (!capture || ['cancelled', 'canceled', 'refunded'].includes(reservation.status)) return null
  const value = Number(capture.value)
  if (!capture.transaction_id || !Number.isFinite(value) || value <= 0 || !/^[A-Z]{3}$/.test(capture.currency)) return null
  return {
    event: 'purchase',
    ecommerce: {
      transaction_id: capture.transaction_id,
      value,
      currency: capture.currency,
      items: [{ item_id: reservation.id, price: value, quantity: 1 }],
    },
  }
}

const queuedTransactions = new Set<string>()

/** GoogleScriptsClient controls tag loading and consent; this only queues non-PII data. */
export function queueVerifiedPurchase(reservation: ReservationDetail) {
  const event = verifiedPurchaseEvent(reservation)
  if (!event || typeof window === 'undefined') return false
  const id = event.ecommerce.transaction_id
  const key = `travel_purchase_queued:${id}`
  if (queuedTransactions.has(id)) return false
  try {
    if (sessionStorage.getItem(key)) return false
  } catch { /* Storage may be unavailable; the in-memory guard still applies. */ }
  const target = window as unknown as { dataLayer?: unknown[] }
  target.dataLayer ??= []
  target.dataLayer.push({ ecommerce: null }, event)
  queuedTransactions.add(id)
  try { sessionStorage.setItem(key, '1') } catch { /* No extra storage requirement. */ }
  return true
}
