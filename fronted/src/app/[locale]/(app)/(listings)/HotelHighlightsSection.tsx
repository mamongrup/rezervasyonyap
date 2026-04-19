'use client'

import {
  LISTING_AMENITY_ICONS,
  getListingAmenityIcon,
  type ListingAmenityId,
} from '@/lib/listing-amenities'
import { Divider } from '@/shared/divider'
import { getMessages } from '@/utils/getT'
import clsx from 'clsx'
import { Sparkles } from 'lucide-react'
import { SectionHeading, SectionSubheading } from './components/SectionHeading'

const KNOWN_AMENITY_IDS = new Set(Object.keys(LISTING_AMENITY_ICONS))

/** Booking/ETStur'daki "Property highlights" / "Öne çıkan özellikler" şeridine
 *  karşılık gelen üst-düzey kart bölümü. Mevcut amenity datasından beslenir,
 *  ek backend alanı veya ek tablo gerektirmez. Otelin "fark yaratan" ilk
 *  birkaç özelliğini büyük ikon + kısa metin halinde ön plana çıkarır.
 *
 *  Kural:
 *  - En az 3 amenity yoksa render edilmez (boş kart şeridi yerine gizlemeyi
 *    tercih ediyoruz).
 *  - İlk 6 öğe alınır; mobilde 2 sütun, sm 3 sütun, lg 6 sütun grid olur.
 *  - Tasarım dili `listingSection__wrap` + `SectionHeading` + `Divider`
 *    diğer bölümlerle birebir aynıdır → mevcut sayfa görünümünü bozmaz. */
const MAX_HIGHLIGHTS = 6
const MIN_TO_SHOW = 3

export default function HotelHighlightsSection({
  locale,
  amenityKeys,
  customLabels,
  className,
}: {
  locale: string
  amenityKeys: readonly string[]
  customLabels?: Record<string, string>
  className?: string
}) {
  const messages = getMessages(locale)
  const t = messages.listing.highlights ?? {}

  const items = amenityKeys.slice(0, MAX_HIGHLIGHTS)
  if (items.length < MIN_TO_SHOW) return null

  const labelOf = (id: string): string => {
    if (KNOWN_AMENITY_IDS.has(id)) {
      const labels = messages.listing.amenities.labels as Record<string, string>
      return labels[id] ?? id
    }
    return customLabels?.[id] ?? id.replace(/_/g, ' ')
  }

  const iconFor = (id: string) =>
    KNOWN_AMENITY_IDS.has(id)
      ? getListingAmenityIcon(id as ListingAmenityId)
      : Sparkles

  return (
    <div className={clsx('listingSection__wrap', className)}>
      <div>
        <SectionHeading>{t.title ?? 'Öne çıkan özellikler'}</SectionHeading>
        <SectionSubheading>
          {t.subtitle ?? 'Bu otelin misafirlerce en çok değer verilen yanları.'}
        </SectionSubheading>
      </div>
      <Divider className="w-14!" />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {items.map((id) => {
          const Icon = iconFor(id)
          return (
            <div
              key={id}
              className="flex flex-col items-center gap-2 rounded-2xl border border-neutral-100 bg-white px-3 py-4 text-center shadow-sm transition-shadow hover:shadow-md dark:border-neutral-700 dark:bg-neutral-800/40"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary-50 text-primary-600 dark:bg-primary-900/30 dark:text-primary-300">
                <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden />
              </span>
              <span className="text-xs leading-snug text-neutral-700 dark:text-neutral-300">
                {labelOf(id)}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
