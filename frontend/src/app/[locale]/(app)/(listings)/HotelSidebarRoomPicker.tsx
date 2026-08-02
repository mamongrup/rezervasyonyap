'use client'

import { hotelRoomCapacityOrDefault } from '@/lib/accommodation-units'
import { buildBoardTypeLabelsFromMessages, resolveHotelBoardTypeLabel } from '@/lib/hotel-room-board-type'
import type { HotelRoomBookingOption } from '@/lib/hotel-room-availability-public'
import { formatMoneyIntl } from '@/lib/parse-listing-price'
import { getMessages } from '@/utils/getT'
import { interpolate } from '@/utils/interpolate'
import clsx from 'clsx'
import { Check } from 'lucide-react'
import { useHotelStayBooking } from './hotel-stay-booking-context'

function SidebarRoomOption({
  room,
  selected,
  locale,
  nightly,
  currencyCode,
  onSelect,
}: {
  room: HotelRoomBookingOption
  selected: boolean
  locale: string
  nightly: number
  currencyCode: string
  onSelect: () => void
}) {
  const messages = getMessages(locale)
  const hb = messages.listing.hotelBooking
  const boardLabels = buildBoardTypeLabelsFromMessages(
    (messages.listing.roomShowcase ?? {}) as Record<string, string>,
  )
  const board = resolveHotelBoardTypeLabel(room.board_type, boardLabels)
  const cap = hotelRoomCapacityOrDefault(room.capacity)
  const priceLabel =
    nightly > 0 ? formatMoneyIntl(nightly, currencyCode || 'TRY') : null

  return (
    <button
      type="button"
      onClick={onSelect}
      className={clsx(
        'flex w-full items-start gap-3 rounded-xl border px-3 py-2.5 text-start text-sm transition',
        selected
          ? 'border-primary-500 bg-primary-50/80 ring-1 ring-primary-500/30 dark:border-primary-400 dark:bg-primary-950/30'
          : 'border-neutral-200 bg-white hover:border-neutral-300 dark:border-neutral-700 dark:bg-neutral-900/40 dark:hover:border-neutral-600',
      )}
    >
      <span
        className={clsx(
          'mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border',
          selected
            ? 'border-primary-600 bg-primary-600 text-white dark:border-primary-400 dark:bg-primary-500'
            : 'border-neutral-300 bg-white dark:border-neutral-600 dark:bg-neutral-900',
        )}
        aria-hidden
      >
        {selected ? <Check className="size-3" strokeWidth={3} /> : null}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-start justify-between gap-2">
          <span className="block font-semibold leading-snug text-neutral-900 dark:text-white">
            {room.name}
          </span>
          {priceLabel ? (
            <span className="shrink-0 text-sm font-semibold tabular-nums text-neutral-900 dark:text-white">
              {priceLabel}
              <span className="ms-1 text-xs font-normal text-neutral-500 dark:text-neutral-400">
                {messages.listing.sidebar.perNight}
              </span>
            </span>
          ) : null}
        </span>
        <span className="mt-1 block text-xs text-neutral-600 dark:text-neutral-400">
          {interpolate(hb.guestCapacitySuffix, { count: String(cap) })}
          {board ? ` · ${board}` : ''}
        </span>
      </span>
    </button>
  )
}

/** Rezervasyon kartı — tarih seçildikten sonra oda listesi. */
export default function HotelSidebarRoomPicker({ locale }: { locale: string }) {
  const booking = useHotelStayBooking()
  const hb = getMessages(locale).listing.hotelBooking

  if (booking.rooms.length === 0) return null

  const priced = booking.rooms
    .map((room) => ({ room, nightly: booking.roomFallbackNightly(room) }))
    .filter((x) => x.nightly > 0)
  const cheapestId =
    priced.length > 0
      ? priced.reduce((best, cur) => (cur.nightly < best.nightly ? cur : best)).room.id
      : null

  return (
    <div className="border-b border-neutral-200 px-3 py-3 dark:border-neutral-700">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
        {hb.sidebarRoomStepTitle}
      </p>
      <ul className="max-h-60 space-y-2 overflow-y-auto pe-0.5">
        {booking.rooms.map((room) => (
          <li key={room.id}>
            <SidebarRoomOption
              room={room}
              selected={booking.selectedRoomId === room.id}
              locale={locale}
              nightly={booking.roomFallbackNightly(room)}
              currencyCode={booking.currencyCode}
              onSelect={() => booking.setSelectedRoomId(room.id)}
            />
            {cheapestId === room.id && booking.rooms.length > 1 ? (
              <p className="mt-1 ps-8 text-[11px] font-medium text-emerald-700 dark:text-emerald-300">
                {hb.bestPriceLabel}
              </p>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  )
}
