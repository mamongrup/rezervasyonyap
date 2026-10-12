import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ReservationDetail } from './travel-api'
import { queueVerifiedPurchase, verifiedPurchaseEvent } from './verified-purchase-event'

const reservation: ReservationDetail = {
  id: 'reservation-id', public_code: 'private-code', status: 'confirmed',
  guest_name: 'Private guest', guest_email: 'private@example.test',
  starts_on: '', ends_on: '', price_breakdown_json: '{"total":10000}', created_at: '', lines: [],
}

describe('verified purchase measurement', () => {
  afterEach(() => vi.unstubAllGlobals())
  it('does not count a redirect or confirmed reservation without a verified capture', () => {
    expect(verifiedPurchaseEvent(reservation)).toBeNull()
  })
  it('measures captured deposit without reporting the unpaid balance or guest details', () => {
    const event = verifiedPurchaseEvent({ ...reservation,
      analytics_purchase: { transaction_id: 'payment-id', value: '2000.00', currency: 'TRY' },
    })
    expect(event?.ecommerce.value).toBe(2000)
    expect(event?.ecommerce.transaction_id).toBe('payment-id')
    expect(JSON.stringify(event)).not.toMatch(/private|guest|email|10000/)
  })
  it.each(['0', '-1', 'NaN', 'Infinity', 'broken'])('rejects invalid captured value %s', value => {
    expect(verifiedPurchaseEvent({ ...reservation,
      analytics_purchase: { transaction_id: 'payment-id', value, currency: 'TRY' },
    })).toBeNull()
  })
  it('rejects cancelled reservations and missing currency', () => {
    const analytics_purchase = { transaction_id: 'payment-id', value: '2000', currency: 'TRY' }
    expect(verifiedPurchaseEvent({ ...reservation, status: 'cancelled', analytics_purchase })).toBeNull()
    expect(verifiedPurchaseEvent({ ...reservation, analytics_purchase: { ...analytics_purchase, currency: '' } })).toBeNull()
  })
  it('queues a capture once even when the page polls again', () => {
    const dataLayer: unknown[] = []
    const storage = new Map<string, string>()
    vi.stubGlobal('window', { dataLayer })
    vi.stubGlobal('sessionStorage', {
      getItem: (key: string) => storage.get(key),
      setItem: (key: string, value: string) => storage.set(key, value),
    })
    const paid = { ...reservation, analytics_purchase: { transaction_id: 'queued-payment', value: '25', currency: 'TRY' } }
    expect(queueVerifiedPurchase(paid)).toBe(true)
    expect(queueVerifiedPurchase(paid)).toBe(false)
    expect(dataLayer).toHaveLength(2)
    expect(dataLayer[0]).toEqual({ ecommerce: null })
  })
  it('does not queue again after a reload in the same session', () => {
    const dataLayer: unknown[] = []
    vi.stubGlobal('window', { dataLayer })
    vi.stubGlobal('sessionStorage', { getItem: () => '1' })
    expect(queueVerifiedPurchase({ ...reservation, analytics_purchase: { transaction_id: 'previous-payment', value: '25', currency: 'TRY' } })).toBe(false)
    expect(dataLayer).toHaveLength(0)
  })
  it('still deduplicates when browser storage is unavailable', () => {
    const dataLayer: unknown[] = []
    vi.stubGlobal('window', { dataLayer })
    vi.stubGlobal('sessionStorage', {
      getItem: () => { throw new Error('blocked') },
      setItem: () => { throw new Error('blocked') },
    })
    const paid = { ...reservation, analytics_purchase: { transaction_id: 'storage-blocked-payment', value: '25', currency: 'TRY' } }
    expect(queueVerifiedPurchase(paid)).toBe(true)
    expect(queueVerifiedPurchase(paid)).toBe(false)
    expect(dataLayer).toHaveLength(2)
  })
})
