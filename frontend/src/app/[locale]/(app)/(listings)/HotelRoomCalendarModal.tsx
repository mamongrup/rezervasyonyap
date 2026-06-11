'use client'

import SectionDateRange from '@/app/[locale]/(app)/(listings)/components/SectionDateRange'
import ButtonClose from '@/shared/ButtonClose'
import {
  fetchPublicHotelRoomAvailabilityDaysSafe,
  type HotelRoomBookingOption,
} from '@/lib/hotel-room-availability-public'
import { getMessages } from '@/utils/getT'
import { CloseButton, Dialog, DialogBackdrop, DialogPanel } from '@headlessui/react'
import { useEffect, useState } from 'react'
import { useHotelStayBooking } from './hotel-stay-booking-context'

function useHotelRoomAvailability(listingId: string, selectedRoom: HotelRoomBookingOption | undefined) {
  const [days, setDays] = useState<Awaited<ReturnType<typeof fetchPublicHotelRoomAvailabilityDaysSafe>>>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!selectedRoom?.id) {
      setDays([])
      return
    }
    let cancelled = false
    setLoading(true)
    void fetchPublicHotelRoomAvailabilityDaysSafe(listingId, selectedRoom.id, selectedRoom.unit_count)
      .then((rows) => {
        if (!cancelled) setDays(rows)
      })
      .catch(() => {
        if (!cancelled) setDays([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [listingId, selectedRoom?.id, selectedRoom?.unit_count])

  return { days, loading }
}

export default function HotelRoomCalendarModal({
  open,
  onClose,
  locale,
  room,
  initialMonthsShown = 2,
}: {
  open: boolean
  onClose: () => void
  locale: string
  room: HotelRoomBookingOption | null
  initialMonthsShown?: 1 | 2
}) {
  const booking = useHotelStayBooking()
  const rs = (getMessages(locale).listing.roomShowcase ?? {}) as Record<string, string>
  const { days, loading } = useHotelRoomAvailability(booking.listingId, room ?? undefined)

  useEffect(() => {
    if (open && room?.id) {
      booking.setSelectedRoomId(room.id)
    }
  }, [open, room?.id, booking.setSelectedRoomId])

  if (!room) return null

  return (
    <Dialog open={open} onClose={onClose} className="relative z-[80]">
      <DialogBackdrop className="fixed inset-0 bg-black/45 backdrop-blur-sm" />
      <div className="fixed inset-0 flex items-end justify-center p-0 sm:items-center sm:p-4">
        <DialogPanel
          transition
          className="relative flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl ring-1 ring-black/5 transition data-closed:translate-y-4 data-closed:opacity-0 sm:rounded-3xl dark:bg-neutral-900 dark:ring-white/10"
        >
          <div className="flex items-start justify-between gap-3 border-b border-neutral-200 px-5 py-4 sm:px-6 dark:border-neutral-700">
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">
                {rs.calendarModalTitle ?? 'Müsaitlik takvimi'}
              </h2>
              <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">{room.name}</p>
            </div>
            <CloseButton as={ButtonClose} className="shrink-0">
              <span className="sr-only">{rs.close ?? 'Kapat'}</span>
            </CloseButton>
          </div>

          <div className="overflow-y-auto p-4 sm:p-5">
            {loading ? (
              <p className="mb-4 text-sm text-neutral-400">
                {rs.calendarLoading ?? 'Takvim yükleniyor…'}
              </p>
            ) : null}
            <SectionDateRange
              locale={locale}
              initialDays={days}
              initialMonthsShown={initialMonthsShown}
              bookingRules={booking.quoteProps.stayBookingRules}
              embedded
              onCompleteRange={(start, end) => {
                booking.setSelectedRoomId(room.id)
                booking.setRange(start, end)
                onClose()
                booking.scrollToReservation()
              }}
            />
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  )
}
