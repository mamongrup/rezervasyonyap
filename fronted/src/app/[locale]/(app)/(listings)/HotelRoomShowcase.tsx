'use client'

import {
  LISTING_AMENITY_ICONS,
  getListingAmenityIcon,
  type ListingAmenityId,
} from '@/lib/listing-amenities'
import { Divider } from '@/shared/divider'
import { getMessages } from '@/utils/getT'
import { interpolate } from '@/utils/interpolate'
import { BedSingle01Icon, UserMultiple02Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  BedDouble,
  ChevronDown,
  Coffee,
  Ruler,
  Sparkles,
  Utensils,
} from 'lucide-react'
import Image from 'next/image'
import { useState } from 'react'
import clsx from 'clsx'
import { SectionHeading, SectionSubheading } from './components/SectionHeading'

/** Booking.com / ETStur'daki "Oda Seçenekleri" panelinin mevcut tasarım temasına
 *  uyarlanmış halidir. Basit tablo yerine her odayı kart olarak gösterir; hotel_rooms
 *  tablosundaki `meta_json` alanındaki opsiyonel alanları (beds, size_m2, bed_type,
 *  description, amenities, image) parse ederek zengin bir görünüm sunar.
 *
 *  Sadece `vertical === 'hotel'` için kullanılır. Yat / tatil evi aynı kalır.
 *  Eski `renderSectionRoomTypes()` tablosu `!isHotel` dallarında dokunulmaz.
 */
export type HotelRoomShowcaseItem = {
  id: string
  name: string
  capacity: number | null
  boardType: string | null
  /** meta_json.beds — odadaki yatak sayısı */
  beds?: number | null
  /** meta_json.bed_type — ör. "1 double, 1 single" */
  bedType?: string | null
  /** meta_json.size_m2 veya size_sqm — metrekare */
  sizeM2?: number | null
  /** meta_json.description — kısa açıklama */
  description?: string | null
  /** meta_json.amenities — oda içi imkânlar (amenity id listesi) */
  amenities?: string[] | null
  /** meta_json.image veya hero_image — oda görseli */
  image?: string | null
}

const KNOWN_AMENITY_IDS = new Set(Object.keys(LISTING_AMENITY_ICONS))

function amenityIconOf(id: string) {
  return KNOWN_AMENITY_IDS.has(id)
    ? getListingAmenityIcon(id as ListingAmenityId)
    : Sparkles
}

function boardTypeChip(
  boardType: string | null | undefined,
  labels: Record<string, string>,
): { label: string; tone: 'ok' | 'warn' } | null {
  if (!boardType) return null
  const v = boardType.trim().toLowerCase()
  if (!v) return null
  // Bilinen plan kodları için özel etiket; serbest metin ise olduğu gibi göster.
  switch (v) {
    case 'bed_breakfast':
    case 'bb':
      return { label: labels.breakfastIncluded, tone: 'ok' }
    case 'half_board':
    case 'hb':
      return { label: labels.halfBoard, tone: 'ok' }
    case 'full_board':
    case 'fb':
      return { label: labels.fullBoard, tone: 'ok' }
    case 'all_inclusive':
    case 'ai':
      return { label: labels.allInclusive, tone: 'ok' }
    case 'room_only':
    case 'ro':
    case 'self_catering':
      return { label: labels.roomOnly, tone: 'warn' }
    default:
      return { label: boardType.trim(), tone: 'ok' }
  }
}

export default function HotelRoomShowcase({
  locale,
  rooms,
  reservationAnchorId,
  currencySymbol,
}: {
  locale: string
  rooms: readonly HotelRoomShowcaseItem[]
  /** "Bu odayı seç" butonunun scroll hedefi; varsa aynı sayfadaki rezervasyon kartı anchor'ı. */
  reservationAnchorId?: string
  /** Şu an demo fiyat kullanılmadığı için sadece chipte mesaj yoksa varsayılan sembol. */
  currencySymbol?: string
}) {
  void currencySymbol
  const messages = getMessages(locale)
  const dp = messages.listing.detailPage
  const rs = messages.listing.roomShowcase ?? {}

  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const toggle = (id: string) =>
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }))

  const boardLabels = {
    breakfastIncluded: rs.breakfastIncluded ?? 'Kahvaltı dahil',
    halfBoard: rs.halfBoard ?? 'Yarım pansiyon',
    fullBoard: rs.fullBoard ?? 'Tam pansiyon',
    allInclusive: rs.allInclusive ?? 'Her şey dahil',
    roomOnly: rs.roomOnly ?? 'Sadece oda',
  }

  const scrollToReservation = () => {
    if (typeof window === 'undefined') return
    const id = reservationAnchorId ?? 'stay-reservation-card'
    const el = document.getElementById(id)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  if (rooms.length === 0) return null

  return (
    <div className="listingSection__wrap">
      <div>
        <SectionHeading>{rs.title ?? dp.roomTypesTitle}</SectionHeading>
        <SectionSubheading>
          {rs.subtitle ?? dp.roomTypesSubtitle}
        </SectionSubheading>
      </div>
      <Divider className="w-14!" />

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {rooms.map((room) => {
          const chip = boardTypeChip(room.boardType, boardLabels)
          const hasExtras = Boolean(
            room.description?.trim() ||
              (room.amenities && room.amenities.length > 0),
          )
          const isOpen = Boolean(expanded[room.id])
          return (
            <article
              key={room.id}
              className="group flex flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm transition-shadow hover:shadow-md dark:border-neutral-700 dark:bg-neutral-800/60"
            >
              {room.image ? (
                <div className="relative h-40 w-full overflow-hidden bg-neutral-100 dark:bg-neutral-700">
                  <Image
                    src={room.image}
                    alt={room.name}
                    fill
                    sizes="(min-width: 768px) 50vw, 100vw"
                    className="object-cover"
                  />
                </div>
              ) : null}
              <div className="flex flex-1 flex-col gap-3 px-5 py-4">
                <header className="flex items-start justify-between gap-3">
                  <h3 className="text-base font-semibold leading-snug text-neutral-900 dark:text-white">
                    {room.name}
                  </h3>
                  {chip ? (
                    <span
                      className={clsx(
                        'inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium',
                        chip.tone === 'ok'
                          ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                          : 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
                      )}
                    >
                      {chip.tone === 'ok' ? (
                        <Coffee className="h-3 w-3" strokeWidth={2} aria-hidden />
                      ) : (
                        <Utensils className="h-3 w-3" strokeWidth={2} aria-hidden />
                      )}
                      {chip.label}
                    </span>
                  ) : null}
                </header>

                <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-neutral-600 dark:text-neutral-400">
                  {room.capacity != null && (
                    <li className="inline-flex items-center gap-1.5">
                      <HugeiconsIcon
                        icon={UserMultiple02Icon}
                        className="h-3.5 w-3.5"
                        strokeWidth={1.75}
                      />
                      {interpolate(dp.guestsShort, { count: String(room.capacity) })}
                    </li>
                  )}
                  {room.beds && room.beds > 0 ? (
                    <li className="inline-flex items-center gap-1.5">
                      <HugeiconsIcon
                        icon={BedSingle01Icon}
                        className="h-3.5 w-3.5"
                        strokeWidth={1.75}
                      />
                      {interpolate(
                        rs.bedsShort ?? '{count} yatak',
                        { count: String(room.beds) },
                      )}
                    </li>
                  ) : null}
                  {room.bedType?.trim() ? (
                    <li className="inline-flex items-center gap-1.5">
                      <BedDouble className="h-3.5 w-3.5" strokeWidth={1.75} />
                      {room.bedType.trim()}
                    </li>
                  ) : null}
                  {typeof room.sizeM2 === 'number' && room.sizeM2 > 0 ? (
                    <li className="inline-flex items-center gap-1.5">
                      <Ruler className="h-3.5 w-3.5" strokeWidth={1.75} />
                      {interpolate(
                        rs.sizeM2 ?? '{value} m²',
                        { value: String(room.sizeM2) },
                      )}
                    </li>
                  ) : null}
                </ul>

                {hasExtras && (
                  <>
                    <button
                      type="button"
                      onClick={() => toggle(room.id)}
                      className="inline-flex items-center gap-1 self-start text-xs font-medium text-primary-600 transition-colors hover:text-primary-700 dark:text-primary-400"
                      aria-expanded={isOpen}
                    >
                      {isOpen
                        ? rs.hideDetails ?? 'Detayları gizle'
                        : rs.showDetails ?? 'Oda detayları'}
                      <ChevronDown
                        className={clsx(
                          'h-3.5 w-3.5 transition-transform',
                          isOpen && 'rotate-180',
                        )}
                        strokeWidth={2}
                      />
                    </button>
                    {isOpen && (
                      <div className="flex flex-col gap-3 border-t border-neutral-100 pt-3 text-xs text-neutral-600 dark:border-neutral-700 dark:text-neutral-400">
                        {room.description?.trim() ? (
                          <p className="leading-relaxed">{room.description.trim()}</p>
                        ) : null}
                        {room.amenities && room.amenities.length > 0 && (
                          <ul className="grid grid-cols-2 gap-x-3 gap-y-1.5 sm:grid-cols-3">
                            {room.amenities.slice(0, 9).map((a) => {
                              const Icon = amenityIconOf(a)
                              const amenityLabels = messages.listing.amenities
                                .labels as Record<string, string>
                              const label =
                                amenityLabels[a] ?? a.replace(/_/g, ' ')
                              return (
                                <li
                                  key={a}
                                  className="inline-flex items-center gap-1.5 text-neutral-700 dark:text-neutral-300"
                                >
                                  <Icon
                                    className="h-3.5 w-3.5 shrink-0 text-primary-600 dark:text-primary-400"
                                    strokeWidth={1.75}
                                    aria-hidden
                                  />
                                  <span className="truncate">{label}</span>
                                </li>
                              )
                            })}
                          </ul>
                        )}
                      </div>
                    )}
                  </>
                )}

                <div className="mt-auto flex items-center justify-between gap-3 pt-2">
                  <span className="text-[11px] text-neutral-500 dark:text-neutral-400">
                    {rs.priceOnDates ?? 'Fiyat seçili tarihlere göre oluşur'}
                  </span>
                  <button
                    type="button"
                    onClick={scrollToReservation}
                    className="inline-flex items-center gap-1 rounded-full bg-primary-600 px-3.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-primary-700"
                  >
                    {rs.selectRoom ?? 'Bu odayı seç'}
                  </button>
                </div>
              </div>
            </article>
          )
        })}
      </div>
      <div className="mt-2 text-xs text-neutral-400 dark:text-neutral-500">
        {dp.roomRatesFootnote}
      </div>
    </div>
  )
}
