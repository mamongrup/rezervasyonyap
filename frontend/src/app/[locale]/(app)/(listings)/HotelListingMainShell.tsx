'use client'

import type { HotelRoomBookingOption } from '@/lib/hotel-room-availability-public'
import type { HotelListingActivity } from '@/lib/travel-api'
import { type ReactNode } from 'react'
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
  children,
}: {
  enabled: boolean
  listingId: string
  rooms: HotelRoomBookingOption[]
  activities?: HotelListingActivity[]
  quoteProps: HotelStayBookingQuoteProps
  children: ReactNode
}) {
  if (!enabled) return children
  return (
    <HotelStayBookingProvider
      listingId={listingId}
      rooms={rooms}
      activities={activities}
      quoteProps={quoteProps}
    >
      {children}
    </HotelStayBookingProvider>
  )
}
