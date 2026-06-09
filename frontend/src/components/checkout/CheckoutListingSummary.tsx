'use client'

import { CHECKOUT_LISTING_FALLBACK_IMAGE } from '@/lib/checkout-listing-fallback-image'
import { checkoutT, fmtCheckout } from '@/lib/checkout-i18n'
import Image from 'next/image'

type Props = {
  locale: string
  loading: boolean
  title: string | null
  location: string | null
  imageUrl: string | null
  maxGuests?: string | null
  roomCount?: string | null
  bathCount?: string | null
}

function parsePositiveInt(raw: string | null | undefined): number | undefined {
  if (!raw?.trim()) return undefined
  const n = parseInt(raw.trim(), 10)
  return Number.isFinite(n) && n > 0 ? n : undefined
}

export default function CheckoutListingSummary({
  locale,
  loading,
  title,
  location,
  imageUrl,
  maxGuests,
  roomCount,
  bathCount,
}: Props) {
  const C = checkoutT(locale)
  const imageSrc = imageUrl || CHECKOUT_LISTING_FALLBACK_IMAGE

  const guests = parsePositiveInt(maxGuests ?? undefined)
  const rooms = parsePositiveInt(roomCount ?? undefined)
  const baths = parsePositiveInt(bathCount ?? undefined)

  const metaParts: string[] = []
  if (guests != null) metaParts.push(fmtCheckout(C.listingMetaGuests, { count: guests }))
  if (rooms != null) metaParts.push(fmtCheckout(C.listingMetaRooms, { count: rooms }))
  if (baths != null) metaParts.push(fmtCheckout(C.listingMetaBaths, { count: baths }))
  const metaLine = metaParts.join(' · ')

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
      <div className="w-full shrink-0 sm:w-44">
        <div className="relative aspect-[4/3] overflow-hidden rounded-2xl">
          <Image alt="" fill sizes="(max-width: 640px) 100vw, 176px" src={imageSrc} className="object-cover" />
        </div>
      </div>
      <div className="min-w-0 flex-1 space-y-2">
        {loading ? (
          <p className="text-sm text-neutral-500 dark:text-neutral-400">{C.sidebarLoading}</p>
        ) : (
          <>
            {location ? (
              <p className="text-sm text-neutral-500 dark:text-neutral-400">{location}</p>
            ) : null}
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">{title || '—'}</h3>
            {metaLine ? (
              <p className="text-sm text-neutral-600 dark:text-neutral-300">{metaLine}</p>
            ) : null}
          </>
        )}
      </div>
    </div>
  )
}
