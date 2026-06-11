'use client'

import { computeHotelRoomStayQuote } from '@/lib/hotel-room-range-quote'
import {
  getHotelRoomBedLabel,
  getHotelRoomGuestLabel,
  getHotelRoomSizeLabel,
} from '@/lib/hotel-room-display'
import {
  fetchHotelRoomHasAvailabilityCalendarSafe,
  fetchPublicHotelRoomAvailabilityDaysSafe,
  type HotelRoomBookingOption,
} from '@/lib/hotel-room-availability-public'
import { usePreferredCurrencyContext } from '@/contexts/preferred-currency-context'
import { convertAmountWithRates } from '@/lib/currency-convert'
import { formatMoneyIntl } from '@/lib/parse-listing-price'
import { Divider } from '@/shared/divider'
import { getMessages } from '@/utils/getT'
import { interpolate } from '@/utils/interpolate'
import {
  BedDouble,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Ruler,
  Users,
} from 'lucide-react'
import Image from 'next/image'
import { useEffect, useMemo, useState } from 'react'
import clsx from 'clsx'
import { SectionHeading, SectionSubheading } from './components/SectionHeading'
import { useOptionalHotelStayBooking } from './hotel-stay-booking-context'
import HotelRoomCalendarModal from './HotelRoomCalendarModal'
import HotelRoomDetailModal from './HotelRoomDetailModal'

export type HotelRoomShowcaseItem = {
  id: string
  name: string
  capacity: number | null
  boardType: string | null
  beds?: number | null
  bedType?: string | null
  sizeM2?: number | null
  description?: string | null
  amenities?: string[] | null
  image?: string | null
  images?: string[] | null
  unitCount?: number
  /** Demo / panel — oda puanı (ETStur tarzı modal başlığı). */
  roomScore?: number | null
  /** Ücretli oda özellikleri (* ile gösterilir). */
  paidAmenities?: string[] | null
}

const ICON_STROKE = 1.5
const PREVIEW_ICON_WRAP =
  'flex size-8 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300'

function RoomPreviewRow({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3 text-sm text-neutral-700 dark:text-neutral-300">
      <span className={PREVIEW_ICON_WRAP}>{icon}</span>
      <span className="min-w-0 flex-1 leading-snug py-1.5">{children}</span>
    </li>
  )
}

function roomImages(room: HotelRoomShowcaseItem): string[] {
  const fromList = (room.images ?? []).filter(Boolean)
  if (fromList.length > 0) return fromList
  return room.image?.trim() ? [room.image.trim()] : []
}

function useRoomRangeQuote(
  listingId: string | undefined,
  room: HotelRoomBookingOption | undefined,
  rangeStart: Date | null,
  rangeEnd: Date | null,
  fallbackNightly: number,
) {
  const [total, setTotal] = useState<number | null>(null)
  const [available, setAvailable] = useState(true)
  const [loading, setLoading] = useState(false)
  const nights =
    rangeStart && rangeEnd ? computeHotelRoomStayQuote([], rangeStart, rangeEnd, 0).nights : 0

  useEffect(() => {
    if (!listingId || !room?.id || !rangeStart || !rangeEnd || nights <= 0) {
      setTotal(null)
      setAvailable(true)
      return
    }
    let cancelled = false
    setLoading(true)
    void fetchPublicHotelRoomAvailabilityDaysSafe(listingId, room.id, room.unit_count)
      .then((days) => {
        if (cancelled) return
        const quote = computeHotelRoomStayQuote(days, rangeStart, rangeEnd, fallbackNightly)
        setTotal(quote.total > 0 ? quote.total : null)
        setAvailable(quote.available)
      })
      .catch(() => {
        if (!cancelled) {
          setTotal(null)
          setAvailable(true)
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [listingId, room?.id, room?.unit_count, rangeStart, rangeEnd, fallbackNightly, nights])

  return { total, available, loading, nights }
}

function RoomImageCarousel({
  images,
  alt,
  onNavigate,
}: {
  images: string[]
  alt: string
  onNavigate?: (e: React.MouseEvent) => void
}) {
  const [index, setIndex] = useState(0)
  const src = images[index] ?? images[0]
  if (!src) {
    return (
      <div className="flex h-full min-h-[168px] w-full items-center justify-center bg-neutral-100 text-xs text-neutral-400 dark:bg-neutral-800 md:min-h-[200px]">
        —
      </div>
    )
  }
  return (
    <div className="group/image relative h-full min-h-[168px] w-full overflow-hidden bg-neutral-100 md:min-h-[200px] dark:bg-neutral-800">
      <Image
        src={src}
        alt={alt}
        fill
        sizes="280px"
        className="object-cover transition duration-500 group-hover/image:scale-[1.03]"
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent opacity-60" />
      {images.length > 1 ? (
        <>
          <button
            type="button"
            aria-label="Önceki fotoğraf"
            onClick={(e) => {
              e.stopPropagation()
              onNavigate?.(e)
              setIndex((i) => (i - 1 + images.length) % images.length)
            }}
            className="absolute left-3 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/95 text-neutral-700 shadow-md ring-1 ring-black/5 transition hover:bg-white dark:bg-neutral-900/95 dark:text-neutral-100"
          >
            <ChevronLeft className="size-4" strokeWidth={2} />
          </button>
          <button
            type="button"
            aria-label="Sonraki fotoğraf"
            onClick={(e) => {
              e.stopPropagation()
              onNavigate?.(e)
              setIndex((i) => (i + 1) % images.length)
            }}
            className="absolute right-3 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/95 text-neutral-700 shadow-md ring-1 ring-black/5 transition hover:bg-white dark:bg-neutral-900/95 dark:text-neutral-100"
          >
            <ChevronRight className="size-4" strokeWidth={2} />
          </button>
          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1">
            {images.map((_, i) => (
              <span
                key={i}
                className={clsx(
                  'size-1.5 rounded-full transition',
                  i === index ? 'bg-white shadow-sm' : 'bg-white/45',
                )}
              />
            ))}
          </div>
        </>
      ) : null}
    </div>
  )
}

function HotelRoomListRow({
  room,
  bookingRoom,
  hasCalendar,
  dp,
  rs,
  onOpenDetail,
  onOpenCalendar,
}: {
  room: HotelRoomShowcaseItem
  bookingRoom?: HotelRoomBookingOption
  hasCalendar: boolean
  dp: ReturnType<typeof getMessages>['listing']['detailPage']
  rs: Record<string, string>
  onOpenDetail: () => void
  onOpenCalendar: () => void
}) {
  const booking = useOptionalHotelStayBooking()
  const ctx = usePreferredCurrencyContext()

  const rangeStart = booking?.rangeStart ?? null
  const rangeEnd = booking?.rangeEnd ?? null
  const hasDates = rangeStart != null && rangeEnd != null

  const { total, available, loading, nights } = useRoomRangeQuote(
    booking?.listingId,
    bookingRoom,
    rangeStart,
    rangeEnd,
    booking?.fallbackNightly ?? 0,
  )

  const formatPrice = (amount: number, fromCurrency: string) => {
    const from = fromCurrency.trim().toUpperCase()
    const target = (ctx?.preferredCode ?? from).toUpperCase()
    const rates = ctx?.rates ?? []
    if (from === target || rates.length === 0) return formatMoneyIntl(amount, from)
    const converted = convertAmountWithRates(amount, from, target, rates)
    return converted != null ? formatMoneyIntl(converted, target) : formatMoneyIntl(amount, from)
  }

  const guestLabel = getHotelRoomGuestLabel(room, dp.guestsShort)
  const bedLabel = getHotelRoomBedLabel(room, rs.bedsShort ?? '{count} yatak')
  const sizeLabel = getHotelRoomSizeLabel(room, rs.sizeM2 ?? '{value} m²')
  const images = roomImages(room)

  const onSelectDates = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (booking) {
      booking.selectRoomAndScroll(room.id)
      return
    }
    document.getElementById('stay-reservation-card')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const onCalendarClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onOpenCalendar()
  }

  return (
    <article className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-neutral-200/80 transition hover:shadow-md hover:ring-neutral-300/80 dark:bg-neutral-900/50 dark:ring-neutral-700">
      <div className="flex flex-col md:flex-row">
        <div
          role="button"
          tabIndex={0}
          onClick={onOpenDetail}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              onOpenDetail()
            }
          }}
          className="relative w-full shrink-0 cursor-pointer overflow-hidden md:w-[260px] lg:w-[280px]"
        >
          <RoomImageCarousel images={images} alt={room.name} />
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          <div
            role="button"
            tabIndex={0}
            onClick={onOpenDetail}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onOpenDetail()
              }
            }}
            className="group cursor-pointer px-5 pt-5 pb-2"
          >
            <h3 className="text-lg font-semibold tracking-tight text-neutral-900 transition group-hover:text-primary-700 dark:text-white dark:group-hover:text-primary-300">
              {room.name}
            </h3>
          </div>

          <div className="flex flex-1 flex-col md:flex-row">
            <div
              role="button"
              tabIndex={0}
              onClick={onOpenDetail}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  onOpenDetail()
                }
              }}
              className="group flex min-w-0 flex-1 cursor-pointer flex-col gap-4 px-5 pb-5 pt-3 text-start md:border-s md:border-neutral-200/80 dark:md:border-neutral-700"
            >
              <ul className="space-y-2">
                {guestLabel ? (
                  <RoomPreviewRow
                    icon={<Users className="size-4" strokeWidth={ICON_STROKE} aria-hidden />}
                  >
                    {guestLabel}
                  </RoomPreviewRow>
                ) : null}
                {bedLabel ? (
                  <RoomPreviewRow
                    icon={<BedDouble className="size-4" strokeWidth={ICON_STROKE} aria-hidden />}
                  >
                    {bedLabel}
                  </RoomPreviewRow>
                ) : null}
                {sizeLabel ? (
                  <RoomPreviewRow
                    icon={<Ruler className="size-4" strokeWidth={ICON_STROKE} aria-hidden />}
                  >
                    {sizeLabel}
                  </RoomPreviewRow>
                ) : null}
              </ul>

              <span className="mt-auto inline-flex items-center gap-1 self-start text-xs font-medium text-neutral-500 transition group-hover:text-primary-700 dark:text-neutral-400 dark:group-hover:text-primary-300">
                {rs.clickForDetails ?? 'Detaylar için tıklayın'}
                <ChevronRight className="size-3.5" strokeWidth={2.5} aria-hidden />
              </span>
            </div>

            <div className="relative flex shrink-0 flex-col items-stretch justify-center gap-4 border-t border-neutral-200/80 px-5 py-6 md:w-[210px] md:border-t-0 lg:w-[230px] dark:border-neutral-700">
              <div
                aria-hidden
                className="pointer-events-none absolute inset-y-8 start-0 hidden w-px bg-neutral-200/80 md:block dark:bg-neutral-700"
              />
          {hasDates ? (
            loading ? (
              <p className="text-center text-xs text-neutral-500">{rs.loadingPrice ?? 'Fiyat hesaplanıyor…'}</p>
            ) : !available ? (
              <p className="text-center text-xs font-medium text-red-600 dark:text-red-400">
                {rs.unavailable ?? 'Seçilen tarihlerde müsait değil'}
              </p>
            ) : total != null && total > 0 ? (
              <div className="text-center">
                <p className="text-2xl font-bold tabular-nums tracking-tight text-neutral-900 dark:text-white">
                  {formatPrice(total, booking?.currencyCode ?? 'TRY')}
                </p>
                <p className="mt-1.5 text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
                  {interpolate(rs.totalForNights ?? '{nights} gece toplam', {
                    nights: String(nights),
                  })}
                </p>
              </div>
            ) : (
              <p className="text-center text-xs leading-relaxed text-neutral-500 dark:text-neutral-400">
                {rs.enterDatesForPrice ?? 'Fiyatlar için tarih giriniz.'}
              </p>
            )
          ) : (
            <p className="text-center text-xs leading-relaxed text-neutral-500 dark:text-neutral-400">
              {rs.enterDatesForPrice ?? 'Fiyatlar için tarih giriniz.'}
            </p>
          )}

          <div className="flex items-stretch gap-2">
            {hasCalendar && bookingRoom ? (
              <button
                type="button"
                onClick={onCalendarClick}
                aria-label={rs.openCalendar ?? 'Müsaitlik takvimi'}
                title={rs.openCalendar ?? 'Müsaitlik takvimi'}
                className="inline-flex size-12 shrink-0 items-center justify-center rounded-2xl border border-neutral-200 bg-white text-neutral-700 transition hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:hover:bg-neutral-700"
              >
                <CalendarDays className="size-5" strokeWidth={ICON_STROKE} aria-hidden />
              </button>
            ) : null}
            <button
              type="button"
              onClick={onSelectDates}
              className="inline-flex min-w-0 flex-1 items-center justify-center rounded-2xl bg-primary-600 px-4 py-3 text-sm font-semibold text-white shadow-sm ring-1 ring-primary-600/20 transition hover:bg-primary-700 hover:shadow-md"
            >
              {rs.selectDates ?? 'Tarih Seç'}
            </button>
          </div>
            </div>
          </div>
        </div>
      </div>
    </article>
  )
}

export default function HotelRoomShowcase({
  locale,
  rooms,
  bookingRooms,
  initialCalendarMonthsShown = 2,
}: {
  locale: string
  rooms: readonly HotelRoomShowcaseItem[]
  bookingRooms?: readonly HotelRoomBookingOption[]
  initialCalendarMonthsShown?: 1 | 2
}) {
  const messages = getMessages(locale)
  const dp = messages.listing.detailPage
  const rs = (messages.listing.roomShowcase ?? {}) as Record<string, string>
  const booking = useOptionalHotelStayBooking()

  const bookingById = useMemo(() => {
    const map = new Map<string, HotelRoomBookingOption>()
    for (const r of bookingRooms ?? []) map.set(r.id, r)
    return map
  }, [bookingRooms])

  const [calendarRoomIds, setCalendarRoomIds] = useState<Set<string>>(new Set())
  const [detailRoom, setDetailRoom] = useState<HotelRoomShowcaseItem | null>(null)
  const [calendarRoom, setCalendarRoom] = useState<HotelRoomBookingOption | null>(null)

  useEffect(() => {
    const listingId = booking?.listingId
    if (!listingId || !bookingRooms?.length) {
      setCalendarRoomIds(new Set())
      return
    }
    let cancelled = false
    void Promise.all(
      bookingRooms.map(async (room) => {
        const linked = await fetchHotelRoomHasAvailabilityCalendarSafe(listingId, room.id)
        return linked ? room.id : null
      }),
    ).then((ids) => {
      if (!cancelled) {
        setCalendarRoomIds(new Set(ids.filter((id): id is string => Boolean(id))))
      }
    })
    return () => {
      cancelled = true
    }
  }, [booking?.listingId, bookingRooms])

  if (rooms.length === 0) return null

  return (
    <div className="listingSection__wrap">
      <div>
        <SectionHeading>{rs.title ?? dp.roomTypesTitle}</SectionHeading>
        <SectionSubheading>{rs.subtitle ?? dp.roomTypesSubtitle}</SectionSubheading>
      </div>
      <Divider className="w-14!" />

      <div className="flex flex-col gap-5">
        {rooms.map((room) => (
          <HotelRoomListRow
            key={room.id}
            room={room}
            bookingRoom={bookingById.get(room.id)}
            hasCalendar={calendarRoomIds.has(room.id)}
            dp={dp}
            rs={rs}
            onOpenDetail={() => setDetailRoom(room)}
            onOpenCalendar={() => {
              const bookingRoom = bookingById.get(room.id)
              if (bookingRoom) setCalendarRoom(bookingRoom)
            }}
          />
        ))}
      </div>

      <HotelRoomDetailModal
        open={detailRoom != null}
        onClose={() => setDetailRoom(null)}
        locale={locale}
        room={detailRoom}
        paidAmenityKeys={
          detailRoom?.paidAmenities ? new Set(detailRoom.paidAmenities) : undefined
        }
        onSelectDates={
          detailRoom && booking
            ? () => booking.selectRoomAndScroll(detailRoom.id)
            : detailRoom
              ? () =>
                  document
                    .getElementById('stay-reservation-card')
                    ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
              : undefined
        }
      />

      {calendarRoom && booking ? (
        <HotelRoomCalendarModal
          open={calendarRoom != null}
          onClose={() => setCalendarRoom(null)}
          locale={locale}
          room={calendarRoom}
          initialMonthsShown={initialCalendarMonthsShown}
        />
      ) : null}
    </div>
  )
}
