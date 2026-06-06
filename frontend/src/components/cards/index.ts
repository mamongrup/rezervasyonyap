'use client'

/**
 * All category listing card components.
 * HotelCard, HolidayHomeCard, YachtCard → use ListingCard with stay-based config
 * TourCard, ActivityCard, CruiseCard    → use ListingCard with experience-based config
 * FerryCard, TransferCard               → use ListingCard with transport config
 * VisaCard, HajjCard                    → specialized layout components
 */

export { default as ListingCard } from './ListingCard'
export { default as VisaCard } from './VisaCard'
export { default as HajjCard } from './HajjCard'

// Re-export existing cards for backward compatibility
export { default as FlightCard } from '@/components/FlightCard'

// ─── Card config factory functions ───────────────────────────────────────────

import ListingCard from './ListingCard'
import { buildTourListingCardMetaLines } from '@/lib/tour-listing-card-meta'
import { holidayHomeCapacitySummary } from '@/lib/holiday-home-capacity-summary'
import { getMessages } from '@/utils/getT'
import { interpolate } from '@/utils/interpolate'
import type {
  CardConfig,
  TListingActivity,
  TListingCar,
  TListingCruise,
  TListingFerry,
  TListingHolidayHome,
  TListingHotel,
  TListingTour,
  TListingTransfer,
  TListingYacht,
} from '@/types/listing-types'
import { ComponentProps, FC, createElement } from 'react'

type ListingCardProps = ComponentProps<typeof ListingCard>

/** Tüm kategori vitrin listelerinde aynı fotoğraf oranı (4:3). */
const LISTING_CARD_IMAGE_RATIO = 'aspect-w-4 aspect-h-3'

function makeCard(config: CardConfig): FC<Omit<ListingCardProps, 'config'>> {
  const Card: FC<Omit<ListingCardProps, 'config'>> = (props) =>
    createElement(ListingCard, { ...props, config })
  Card.displayName = `ListingCard(${config.linkBase})`
  return Card
}

// ─── Konaklama Kartları ───────────────────────────────────────────────────────

export const HotelCard = makeCard({
  linkBase: '/otel',
  ratioClass: LISTING_CARD_IMAGE_RATIO,
  extraInfo: (d, locale) => {
    const cm = getMessages(locale).listing.cardMeta
    const { beds, bathrooms: baths, stars, hotelTypeCode } = d as TListingHotel
    const hotelType = hotelTypeCode?.replace(/_/g, ' ')
    const starLine = stars ? interpolate(cm.stars, { count: String(stars) }) : null
    if (starLine || hotelType || beds || baths) {
      return [
        starLine,
        hotelType,
        beds && interpolate(cm.hotelRooms, { count: String(beds) }),
        baths && interpolate(cm.hotelBaths, { count: String(baths) }),
      ]
        .filter(Boolean)
        .join(' · ')
    }
    return null
  },
})

export const HolidayHomeCard = makeCard({
  linkBase: '/tatil-evi',
  ratioClass: LISTING_CARD_IMAGE_RATIO,
  extraInfo: (d, locale) =>
    holidayHomeCapacitySummary(d as TListingHolidayHome, getMessages(locale).listing.capacitySpec),
})

export const YachtCard = makeCard({
  linkBase: '/yat',
  ratioClass: LISTING_CARD_IMAGE_RATIO,
  extraInfo: (d, locale) => {
    const copy = getMessages(locale).listing.capacitySpec
    const cm = getMessages(locale).listing.cardMeta
    const { maxGuests, bedrooms, bathrooms } = d
    const parts: string[] = []
    if (maxGuests != null && maxGuests > 0) parts.push(`${maxGuests} ${copy.guests}`)
    if (bedrooms != null && bedrooms > 0) {
      parts.push(interpolate(cm.yachtCabins, { count: String(bedrooms) }))
    }
    if (bathrooms != null && bathrooms > 0) parts.push(`${bathrooms} ${copy.bathrooms}`)
    if (parts.length) return parts.join(' · ')
    const { lengthM: len, capacity: cap, type } = d as TListingYacht
    return [
      type,
      len && `${len}m`,
      cap && interpolate(cm.yachtPeople, { count: String(cap) }),
    ]
      .filter(Boolean)
      .join(' · ') || null
  },
})

// ─── Deneyim Kartları ─────────────────────────────────────────────────────────

export const TourCard = makeCard({
  linkBase: '/tur',
  ratioClass: LISTING_CARD_IMAGE_RATIO,
  metaLines: (d, locale) => buildTourListingCardMetaLines(d as TListingTour, locale),
})

export const ActivityCard = makeCard({
  linkBase: '/aktivite',
  ratioClass: LISTING_CARD_IMAGE_RATIO,
  extraInfo: (d, locale) => {
    const cm = getMessages(locale).listing.cardMeta
    const { durationHours: hours, minAge: age } = d as TListingActivity
    return [
      hours && interpolate(cm.activityHours, { hours: String(hours) }),
      age && interpolate(cm.activityMinAge, { age: String(age) }),
    ]
      .filter(Boolean)
      .join(' · ') || null
  },
})

export const CruiseCard = makeCard({
  linkBase: '/gemi-turu',
  ratioClass: LISTING_CARD_IMAGE_RATIO,
  extraInfo: (d, locale) => {
    const cm = getMessages(locale).listing.cardMeta
    const { nights, shipName: ship } = d as TListingCruise
    return [
      ship,
      nights && interpolate(cm.cruiseNights, { nights: String(nights) }),
    ]
      .filter(Boolean)
      .join(' · ') || null
  },
})

export const BeachLoungerCard = makeCard({
  linkBase: '/plaj-sezlong-ilan',
  ratioClass: LISTING_CARD_IMAGE_RATIO,
  extraInfo: () => null,
})

export const CinemaTicketCard = makeCard({
  linkBase: '/sinema-bileti',
  ratioClass: LISTING_CARD_IMAGE_RATIO,
  extraInfo: () => null,
})

export const EventTicketCard = makeCard({
  linkBase: '/etkinlik',
  ratioClass: LISTING_CARD_IMAGE_RATIO,
  extraInfo: () => null,
})

export const RestaurantTableCard = makeCard({
  linkBase: '/restoran-masa',
  ratioClass: LISTING_CARD_IMAGE_RATIO,
  extraInfo: () => null,
})

// ─── Ulaşım Kartları ──────────────────────────────────────────────────────────

export const TransferCard = makeCard({
  linkBase: '/tasima',
  ratioClass: LISTING_CARD_IMAGE_RATIO,
  extraInfo: (d, _locale) => {
    const { fromLocation: from, toLocation: to, vehicleType: vehicle } = d as TListingTransfer
    if (from && to) return `${from} → ${to}`
    return vehicle ?? null
  },
})

export const FerryCard = makeCard({
  linkBase: '/feribot-rezervasyon',
  ratioClass: LISTING_CARD_IMAGE_RATIO,
  extraInfo: (d, locale) => {
    const cm = getMessages(locale).listing.cardMeta
    const { fromPort: from, toPort: to, durationMin: duration } = d as TListingFerry
    if (from && to) {
      const suffix =
        duration != null
          ? ` (${interpolate(cm.ferryMinutes, { minutes: String(Math.round(duration / 60)) })})`
          : ''
      return `${from} → ${to}${suffix}`
    }
    return null
  },
})

export const CarRentalCard = makeCard({
  linkBase: '/arac',
  ratioClass: LISTING_CARD_IMAGE_RATIO,
  extraInfo: (d, locale) => {
    const cm = getMessages(locale).listing.cardMeta
    const { seats, gearshift: gear } = d as TListingCar
    return [
      seats && interpolate(cm.carSeats, { count: String(seats) }),
      gear,
    ]
      .filter(Boolean)
      .join(' · ') || null
  },
})
