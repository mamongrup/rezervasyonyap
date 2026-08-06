import type { ComponentType } from 'react'
import type { TListingBase } from '@/types/listing-types'
import {
  ActivityCard,
  BeachLoungerCard,
  CarRentalCard,
  CinemaTicketCard,
  CruiseCard,
  EventTicketCard,
  FerryCard,
  HajjCard,
  HolidayHomeCard,
  HotelCard,
  RestaurantTableCard,
  TourCard,
  TransferCard,
  VisaCard,
  YachtCard,
} from '@/components/cards'

type ListingCardComponent = ComponentType<{
  data: TListingBase
  className?: string
  size?: 'default' | 'small'
  priority?: boolean
}>

/**
 * Kategori slug → vitrin listesiyle aynı kart bileşeni.
 * Öne çıkan bloklar / kaydırıcılar HotelCard vb. kullansın diye tek kaynak.
 */
const CATEGORY_LISTING_CARDS: Record<string, ListingCardComponent> = {
  oteller: HotelCard as ListingCardComponent,
  'tatil-evleri': HolidayHomeCard as ListingCardComponent,
  'yat-kiralama': YachtCard as ListingCardComponent,
  turlar: TourCard as ListingCardComponent,
  aktiviteler: ActivityCard as ListingCardComponent,
  kruvaziyer: CruiseCard as ListingCardComponent,
  'hac-umre': HajjCard as ListingCardComponent,
  vize: VisaCard as ListingCardComponent,
  'arac-kiralama': CarRentalCard as ListingCardComponent,
  feribot: FerryCard as ListingCardComponent,
  transfer: TransferCard as ListingCardComponent,
  'plaj-sezlong': BeachLoungerCard as ListingCardComponent,
  'sinema-biletleri': CinemaTicketCard as ListingCardComponent,
  etkinlikler: EventTicketCard as ListingCardComponent,
  'restoran-rezervasyon': RestaurantTableCard as ListingCardComponent,
}

export function listingCardForCategorySlug(
  categorySlug: string | undefined | null,
): ListingCardComponent | null {
  const slug = (categorySlug ?? '').trim()
  if (!slug) return null
  return CATEGORY_LISTING_CARDS[slug] ?? null
}
