'use client'

import type { HotelRoomBookingOption } from '@/lib/hotel-room-availability-public'
import type { HotelListingActivity, ListingPriceRuleRow } from '@/lib/travel-api'
import { Suspense, type ReactNode } from 'react'
import {
  HotelStayBookingProvider,
  type HotelStayBookingQuoteProps,
} from './hotel-stay-booking-context'

export default function HotelListingMainShell({
  enabled,
  listingId,
  rooms,
  activities = [],
  quoteProps,
  priceRules = [],
  liveKplus = false,
  children,
}: {
  enabled: boolean
  listingId: string
  rooms: HotelRoomBookingOption[]
  activities?: HotelListingActivity[]
  quoteProps: HotelStayBookingQuoteProps
  priceRules?: ListingPriceRuleRow[]
  liveKplus?: boolean
  children: ReactNode
}) {
  if (!enabled) return children
  return (
    <Suspense fallback={null}>
      <HotelStayBookingProvider
        listingId={listingId}
        rooms={rooms}
        activities={activities}
        quoteProps={quoteProps}
        priceRules={priceRules}
        liveKplus={liveKplus}
      >
        {children}
      </HotelStayBookingProvider>
    </Suspense>
  )
}
