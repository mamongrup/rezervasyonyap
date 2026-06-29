'use client'

import { useVitrinHref } from '@/hooks/use-vitrin-href'
import { buildStayCheckoutUrl } from '@/lib/stay-checkout-url'
import { resolveCheckoutPaymentAmount } from '@/lib/checkout-payment-currency'
import { usePreferredCurrencyContext } from '@/contexts/preferred-currency-context'
import {
  defaultStayListingGuests,
  parsePoolHeatingFromSearchParams,
  parseStayListingDatesFromSearchParams,
  parseStayListingGuestsFromSearchParams,
} from '@/lib/stay-listing-booking-init'
import type { GuestsObject } from '@/type'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

type VillaStayBookingContextValue = {
  rangeStart: Date | null
  rangeEnd: Date | null
  setRange: (start: Date | null, end: Date | null) => void
  guests: GuestsObject
  setGuests: (guests: GuestsObject) => void
  poolHeatingSelected: boolean
  setPoolHeatingSelected: (selected: boolean) => void
  scrollToReservation: () => void
  goCheckout: (input: {
    listingId: string
    currencyCode: string
    grandTotal: number
    heatingSubtotal: number
  }) => void
}

const VillaStayBookingContext = createContext<VillaStayBookingContextValue | null>(null)

export function VillaStayBookingProvider({
  reservationAnchorId = 'stay-reservation-card',
  children,
}: {
  reservationAnchorId?: string
  children: ReactNode
}) {
  const router = useRouter()
  const vitrinHref = useVitrinHref()
  const searchParams = useSearchParams()
  const currencyCtx = usePreferredCurrencyContext()

  const [rangeStart, setRangeStart] = useState<Date | null>(null)
  const [rangeEnd, setRangeEnd] = useState<Date | null>(null)
  const [guests, setGuests] = useState<GuestsObject>(defaultStayListingGuests)
  const [poolHeatingSelected, setPoolHeatingSelected] = useState(false)
  const [urlHydrated, setUrlHydrated] = useState(false)

  useEffect(() => {
    if (urlHydrated) return
    const { start, end } = parseStayListingDatesFromSearchParams(searchParams)
    if (start && end) {
      setRangeStart(start)
      setRangeEnd(end)
    }
    setGuests(parseStayListingGuestsFromSearchParams(searchParams))
    setPoolHeatingSelected(parsePoolHeatingFromSearchParams(searchParams))
    setUrlHydrated(true)
  }, [searchParams, urlHydrated])

  const setRange = useCallback((start: Date | null, end: Date | null) => {
    setRangeStart(start)
    setRangeEnd(end)
  }, [])

  const scrollToReservation = useCallback(() => {
    if (typeof window === 'undefined') return
    document.getElementById(reservationAnchorId)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [reservationAnchorId])

  const goCheckout = useCallback(
    (input: {
      listingId: string
      currencyCode: string
      grandTotal: number
      heatingSubtotal: number
    }) => {
      if (!input.listingId.trim() || !rangeStart || !rangeEnd || input.grandTotal <= 0) return
      const payment = resolveCheckoutPaymentAmount(
        input.currencyCode,
        input.grandTotal,
        currencyCtx?.rates ?? [],
        currencyCtx?.preferredCode,
      )
      const heatingPayment =
        input.heatingSubtotal > 0
          ? resolveCheckoutPaymentAmount(
              input.currencyCode,
              input.heatingSubtotal,
              currencyCtx?.rates ?? [],
              currencyCtx?.preferredCode,
            )
          : { unitPrice: 0 }
      router.push(
        buildStayCheckoutUrl(vitrinHref('/checkout'), {
          listingId: input.listingId,
          startDate: rangeStart,
          endDate: rangeEnd,
          currencyCode: payment.currencyCode,
          unitPrice: payment.unitPrice,
          guests,
          poolHeatingSelected,
          poolHeatingFee: heatingPayment.unitPrice,
        }),
      )
    },
    [router, vitrinHref, rangeStart, rangeEnd, guests, poolHeatingSelected, currencyCtx],
  )

  const value = useMemo(
    (): VillaStayBookingContextValue => ({
      rangeStart,
      rangeEnd,
      setRange,
      guests,
      setGuests,
      poolHeatingSelected,
      setPoolHeatingSelected,
      scrollToReservation,
      goCheckout,
    }),
    [
      rangeStart,
      rangeEnd,
      setRange,
      guests,
      poolHeatingSelected,
      scrollToReservation,
      goCheckout,
    ],
  )

  return (
    <VillaStayBookingContext.Provider value={value}>{children}</VillaStayBookingContext.Provider>
  )
}

export function useVillaStayBooking() {
  const ctx = useContext(VillaStayBookingContext)
  if (!ctx) {
    throw new Error('useVillaStayBooking must be used within VillaStayBookingProvider')
  }
  return ctx
}

export function useOptionalVillaStayBooking() {
  return useContext(VillaStayBookingContext)
}
