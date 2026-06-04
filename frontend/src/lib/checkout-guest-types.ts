import type { GuestsObject } from '@/type'

export type CheckoutGuestRow = {
  first_name: string
  last_name: string
  national_id: string
}

export type CheckoutInvoice = {
  full_name: string
  national_id: string
  address: string
  city: string
  email: string
  phone: string
}

export type CheckoutPaymentChannel =
  | 'bank_transfer'
  | 'western_union'
  | 'ria'
  | 'card'

export function guestRowsForStay(guests: GuestsObject): number {
  const n =
    (guests.guestAdults ?? 0) + (guests.guestChildren ?? 0) + (guests.guestInfants ?? 0)
  return Math.max(1, n)
}

export function emptyGuestRow(): CheckoutGuestRow {
  return { first_name: '', last_name: '', national_id: '' }
}

export function invoiceFromPrimaryGuest(
  row: CheckoutGuestRow,
  email: string,
  phone: string,
): CheckoutInvoice {
  const full = [row.first_name, row.last_name].filter(Boolean).join(' ').trim()
  return {
    full_name: full,
    national_id: row.national_id,
    address: '',
    city: '',
    email,
    phone,
  }
}

export function checkoutMetaPayload(
  guests: CheckoutGuestRow[],
  invoice: CheckoutInvoice,
  paymentChannel: CheckoutPaymentChannel,
) {
  return {
    guests,
    invoice,
    payment_channel: paymentChannel,
  }
}
