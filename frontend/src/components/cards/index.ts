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
import { holidayHomeCapacitySummary } from '@/lib/holiday-home-capacity-summary'
import { getMessages } from '@/utils/getT'
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

function makeCard(config: CardConfig): FC<Omit<ListingCardProps, 'config'>> {
  const Card: FC<Omit<ListingCardProps, 'config'>> = (props) =>
    createElement(ListingCard, { ...props, config })
  Card.displayName = `ListingCard(${config.linkBase})`
  return Card
}

// ─── Konaklama Kartları ───────────────────────────────────────────────────────

export const HotelCard = makeCard({
  linkBase: '/otel',
  priceUnit: '/gece',
  ratioClass: 'aspect-w-4 aspect-h-3',
  categoryLabel: 'Otel',
  extraInfo: (d, _locale) => {
    const { beds, bathrooms: baths } = d as TListingHotel
    if (beds || baths) return [beds && `${beds} yatak`, baths && `${baths} banyo`].filter(Boolean).join(' · ')
    return null
  },
})

export const HolidayHomeCard = makeCard({
  linkBase: '/tatil-evi',
  priceUnit: '/gece',
  ratioClass: 'aspect-w-4 aspect-h-3',
  categoryLabel: 'Tatil Evi',
  extraInfo: (d, locale) =>
    holidayHomeCapacitySummary(d as TListingHolidayHome, getMessages(locale).listing.capacitySpec),
})

export const YachtCard = makeCard({
  linkBase: '/yat',
  priceUnit: '/gece',
  ratioClass: 'aspect-w-16 aspect-h-9',
  categoryLabel: 'Yat',
  extraInfo: (d, _locale) => {
    const { lengthM: len, capacity: cap, type } = d as TListingYacht
    return [type, len && `${len}m`, cap && `${cap} kişilik`].filter(Boolean).join(' · ') || null
  },
})

// ─── Deneyim Kartları ─────────────────────────────────────────────────────────

export const TourCard = makeCard({
  linkBase: '/tur',
  priceUnit: '/kişi',
  ratioClass: 'aspect-w-3 aspect-h-3',
  categoryLabel: 'Tur',
  extraInfo: (d, _locale) => {
    const { durationDays: days, maxGroupSize: group } = d as TListingTour
    return [days && `${days} gün`, group && `Maks ${group} kişi`].filter(Boolean).join(' · ') || null
  },
})

export const ActivityCard = makeCard({
  linkBase: '/aktivite',
  priceUnit: '/kişi',
  ratioClass: 'aspect-w-3 aspect-h-3',
  categoryLabel: 'Aktivite',
  extraInfo: (d, _locale) => {
    const { durationHours: hours, minAge: age } = d as TListingActivity
    return [hours && `${hours} saat`, age && `Min ${age} yaş`].filter(Boolean).join(' · ') || null
  },
})

export const CruiseCard = makeCard({
  linkBase: '/gemi-turu',
  priceUnit: '/kişi',
  ratioClass: 'aspect-w-16 aspect-h-9',
  categoryLabel: 'Kruvaziyer',
  extraInfo: (d, _locale) => {
    const { nights, shipName: ship } = d as TListingCruise
    return [ship, nights && `${nights} gece`].filter(Boolean).join(' · ') || null
  },
})

// ─── Ulaşım Kartları ──────────────────────────────────────────────────────────

export const TransferCard = makeCard({
  linkBase: '/tasima',
  priceUnit: '/araç',
  ratioClass: 'aspect-w-16 aspect-h-9',
  categoryLabel: 'Transfer',
  extraInfo: (d, _locale) => {
    const { fromLocation: from, toLocation: to, vehicleType: vehicle } = d as TListingTransfer
    if (from && to) return `${from} → ${to}`
    return vehicle ?? null
  },
})

export const FerryCard = makeCard({
  linkBase: '/feribot-rezervasyon',
  priceUnit: '/kişi',
  ratioClass: 'aspect-w-16 aspect-h-9',
  categoryLabel: 'Feribot',
  extraInfo: (d, _locale) => {
    const { fromPort: from, toPort: to, durationMin: duration } = d as TListingFerry
    if (from && to) return `${from} → ${to}${duration ? ` (${Math.round(duration / 60)}s)` : ''}`
    return null
  },
})

export const CarRentalCard = makeCard({
  linkBase: '/arac',
  priceUnit: '/gün',
  ratioClass: 'aspect-w-16 aspect-h-9',
  categoryLabel: 'Araç Kiralama',
  extraInfo: (d, _locale) => {
    const { seats, gearshift: gear } = d as TListingCar
    return [seats && `${seats} koltuk`, gear].filter(Boolean).join(' · ') || null
  },
})
