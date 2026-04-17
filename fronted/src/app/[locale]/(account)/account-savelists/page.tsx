'use client'

import ListingCard from '@/components/cards/ListingCard'
import { useFavorites } from '@/context/FavoritesContext'
import { getStoredAuthToken } from '@/lib/auth-storage'
import { searchPublicListings } from '@/lib/travel-api'
import { Divider } from '@/shared/divider'
import type { TListingBase } from '@/types/listing-types'
import { getMessages } from '@/utils/getT'
import { FavouriteIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { useVitrinHref } from '@/hooks/use-vitrin-href'
import { DETAIL_SEGMENT_BY_VERTICAL } from '@/lib/listing-detail-routes'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'

/** Maps API category_code to the listing detail route prefix (internal App Router segment) */
const CODE_TO_ROUTE: Record<string, string> = {
  hotel: `/${DETAIL_SEGMENT_BY_VERTICAL.hotel}`,
  holiday_home: `/${DETAIL_SEGMENT_BY_VERTICAL.holiday_home}`,
  yacht_charter: `/${DETAIL_SEGMENT_BY_VERTICAL.yacht_charter}`,
  tour: `/${DETAIL_SEGMENT_BY_VERTICAL.tour}`,
  activity: `/${DETAIL_SEGMENT_BY_VERTICAL.activity}`,
  cruise: `/${DETAIL_SEGMENT_BY_VERTICAL.cruise}`,
  hajj: `/${DETAIL_SEGMENT_BY_VERTICAL.hajj}`,
  visa: `/${DETAIL_SEGMENT_BY_VERTICAL.visa}`,
  car_rental: `/${DETAIL_SEGMENT_BY_VERTICAL.car_rental}`,
  transfer: `/${DETAIL_SEGMENT_BY_VERTICAL.transfer}`,
  ferry: `/${DETAIL_SEGMENT_BY_VERTICAL.ferry}`,
  flight: `/${DETAIL_SEGMENT_BY_VERTICAL.flight}`,
}

function detailRoute(categoryCode: string): string {
  return CODE_TO_ROUTE[categoryCode] ?? `/${DETAIL_SEGMENT_BY_VERTICAL.hotel}`
}

interface FavListing extends TListingBase {
  categoryCode?: string
}

export default function AccountSavelistsPage() {
  const params = useParams()
  const locale = typeof params?.locale === 'string' ? params.locale : 'tr'
  const vitrinPath = useVitrinHref()
  const T = getMessages(locale).accountPage

  const { favorites, loading: favLoading } = useFavorites()
  const [listings, setListings] = useState<FavListing[]>([])
  const [fetching, setFetching] = useState(false)

  useEffect(() => {
    if (favLoading) return
    if (favorites.length === 0) {
      setListings([])
      return
    }

    setFetching(true)
    const token = getStoredAuthToken()
    searchPublicListings({ listingIds: favorites, perPage: 100, locale })
      .then((res) => {
        if (!res) return
        const mapped: FavListing[] = res.listings.map((item) => ({
          id: item.id,
          handle: item.slug,
          title: item.title,
          listingCategory: item.category_code,
          address: item.location ?? undefined,
          city: item.location ?? undefined,
          price: item.price_from ?? undefined,
          priceAmount: item.price_from ? parseFloat(item.price_from) : undefined,
          priceCurrency: item.currency_code,
          reviewStart: item.review_avg ?? undefined,
          reviewCount: item.review_count,
          featuredImage: item.featured_image_url ?? item.thumbnail_url ?? undefined,
          galleryImgs: item.featured_image_url ? [item.featured_image_url] : [],
          isNew: item.is_new,
          discountPercent: item.discount_percent ?? undefined,
          isCampaign: item.is_campaign,
          createdAt: item.created_at,
          like: true,
          saleOff: item.discount_percent != null ? `%${item.discount_percent}` : null,
          isAds: null,
          mealPlanSummary: item.meal_plan_summary ?? undefined,
          categoryCode: item.category_code,
        }))
        setListings(mapped)
      })
      .catch(() => setListings([]))
      .finally(() => setFetching(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [favorites, favLoading])

  const isLoading = favLoading || fetching

  return (
    <div>
      <h1 className="text-3xl font-semibold">{T['Saved listings']}</h1>
      <Divider className="my-8 w-14!" />

      {isLoading && (
        <div className="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 md:gap-x-8 md:gap-y-12 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-80 animate-pulse rounded-2xl bg-neutral-100 dark:bg-neutral-800" />
          ))}
        </div>
      )}

      {!isLoading && listings.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <HugeiconsIcon
            icon={FavouriteIcon}
            className="mb-4 h-16 w-16 text-neutral-300 dark:text-neutral-600"
            strokeWidth={1.75}
          />
          <h3 className="text-lg font-semibold text-neutral-700 dark:text-neutral-300">
            {T.noFavoritesTitle}
          </h3>
          <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
            {T.noFavoritesDesc}
          </p>
          <Link
            href={vitrinPath('/')}
            className="mt-6 rounded-full bg-primary-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-primary-700"
          >
            {T.exploreListing}
          </Link>
        </div>
      )}

      {!isLoading && listings.length > 0 && (
        <div className="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 md:gap-x-8 md:gap-y-12 lg:grid-cols-3 xl:grid-cols-4">
          {listings.map((listing) => (
            <ListingCard
              key={listing.id}
              data={listing}
              config={{
                linkBase: detailRoute(listing.categoryCode ?? ''),
                priceUnit: T.pricePerNight,
                ratioClass: 'aspect-w-4 aspect-h-3',
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}
