'use client'

import { useVitrinHref } from '@/hooks/use-vitrin-href'
import {
  checkoutStatusLabel,
  checkoutT,
  fmtCheckout,
  formatCheckoutDate,
  formatCheckoutMoney,
} from '@/lib/checkout-i18n'
import {
  getReservationByPublicCode,
  type ReservationDetail,
  type ReservationLineDetail,
} from '@/lib/travel-api'
import ButtonPrimary from '@/shared/ButtonPrimary'
import { DescriptionDetails, DescriptionList, DescriptionTerm } from '@/shared/description-list'
import { Divider } from '@/shared/divider'
import { Airplane01Icon, Calendar04Icon, Home01Icon, UserIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { useParams, useSearchParams } from 'next/navigation'
import React from 'react'

function turnaRefsFromLines(
  lines: ReservationLineDetail[] | undefined,
): { pnr: string; systemRef: string } | null {
  if (!lines?.length) return null
  for (const line of lines) {
    const raw = line.meta_json?.trim()
    if (!raw) continue
    try {
      const meta = JSON.parse(raw) as {
        turna_booking?: { status?: string; pnr?: string; system_ref?: string }
      }
      const tb = meta.turna_booking
      if (tb?.status === 'completed') {
        const pnr = tb.pnr?.trim() ?? ''
        const systemRef = tb.system_ref?.trim() ?? ''
        if (pnr || systemRef) return { pnr, systemRef }
      }
    } catch {
      /* ignore */
    }
  }
  return null
}

function hotelMetaFromLines(
  lines: ReservationLineDetail[] | undefined,
): {
  roomName: string | null
  boardLabel: string | null
  guestAdults: number | null
  guestChildren: number | null
  guestInfants: number | null
} | null {
  if (!lines?.length) return null
  for (const line of lines) {
    const raw = line.meta_json?.trim()
    if (!raw) continue
    try {
      const meta = JSON.parse(raw) as Record<string, unknown>
      if (!meta.hotel_room_id) continue
      return {
        roomName: typeof meta.hotel_room_name === 'string' ? meta.hotel_room_name : null,
        boardLabel:
          typeof meta.meal_plan_label === 'string'
            ? meta.meal_plan_label
            : typeof meta.hotel_board_label === 'string'
              ? meta.hotel_board_label
              : null,
        guestAdults: typeof meta.guest_adults === 'number' ? meta.guest_adults : null,
        guestChildren: typeof meta.guest_children === 'number' ? meta.guest_children : null,
        guestInfants: typeof meta.guest_infants === 'number' ? meta.guest_infants : null,
      }
    } catch {
      /* ignore */
    }
  }
  return null
}

export default function PayDoneView() {
  const vitrinHref = useVitrinHref()
  const params = useParams()
  const searchParams = useSearchParams()
  const locale = typeof params?.locale === 'string' ? params.locale : 'tr'
  const C = checkoutT(locale)
  const PD = C.payDone
  const publicCode = searchParams.get('code')

  const [reservation, setReservation] = React.useState<ReservationDetail | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [confirmExtra, setConfirmExtra] = React.useState<{
    is_flight?: boolean
    flight_route?: string
    flight_departure_date?: string
    flight_airline?: string
    listing_title?: string | null
    listing_location?: string | null
    hotel_room_name?: string | null
    hotel_board_label?: string | null
    guest_adults?: number
    guest_children?: number
    guest_infants?: number
    amount_total?: number
    amount_paid?: number
    amount_remaining?: number
  } | null>(null)

  React.useEffect(() => {
    document.documentElement.scrollTo({ top: 0, behavior: 'instant' })
    try {
      const raw = sessionStorage.getItem('travel_checkout_confirm')
      if (raw) {
        setConfirmExtra(JSON.parse(raw) as typeof confirmExtra)
        sessionStorage.removeItem('travel_checkout_confirm')
      }
    } catch {
      /* ignore */
    }
  }, [])

  React.useEffect(() => {
    if (!publicCode) {
      setLoading(false)
      return
    }
    const email = localStorage.getItem('travel_paydone_email') ?? ''
    if (!email) {
      setLoading(false)
      return
    }
    getReservationByPublicCode(publicCode, email)
      .then((data) => {
        setReservation(data)
        localStorage.removeItem('travel_paydone_email')
      })
      .catch(() => {
        /* statik fallback */
      })
      .finally(() => setLoading(false))
  }, [publicCode])

  const totalFromLines = React.useMemo(() => {
    if (!reservation?.lines.length) return null
    return reservation.lines.reduce((acc, l) => acc + parseFloat(l.line_total || '0'), 0)
  }, [reservation])

  const isFlightBooking = Boolean(confirmExtra?.is_flight)
  const turnaRefs = React.useMemo(
    () => turnaRefsFromLines(reservation?.lines),
    [reservation?.lines],
  )
  const hotelMeta = React.useMemo(
    () => hotelMetaFromLines(reservation?.lines),
    [reservation?.lines],
  )
  const hotelRoomName = confirmExtra?.hotel_room_name ?? hotelMeta?.roomName
  const hotelBoardLabel = confirmExtra?.hotel_board_label ?? hotelMeta?.boardLabel
  const guestAdults = confirmExtra?.guest_adults ?? hotelMeta?.guestAdults ?? null
  const guestChildren = confirmExtra?.guest_children ?? hotelMeta?.guestChildren ?? null
  const guestInfants = confirmExtra?.guest_infants ?? hotelMeta?.guestInfants ?? null
  const guestSummary =
    guestAdults != null
      ? fmtCheckout(C.guestsLine, {
          adults: String(guestAdults),
          children: String(guestChildren ?? 0),
          infants: String(guestInfants ?? 0),
        })
      : null

  if (loading) {
    return (
      <main className="container mt-10 mb-24">
        <p className="text-neutral-500 dark:text-neutral-400">{PD.loading}</p>
      </main>
    )
  }

  return (
    <main className="container mt-10 mb-24 sm:mt-16 lg:mb-32">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-y-12 px-0 sm:rounded-2xl sm:p-6 xl:p-8">
        <h1 className="text-4xl font-semibold sm:text-5xl">
          {PD.congratulation} 🎉
        </h1>
        <p className="text-lg text-neutral-600 dark:text-neutral-400">
          {isFlightBooking ? PD.flightSectionTitle : PD.sectionTitle}
        </p>
        {isFlightBooking && PD.flightNotifyNote ? (
          <p className="text-sm text-neutral-500 dark:text-neutral-400">{PD.flightNotifyNote}</p>
        ) : PD.notifyNote ? (
          <p className="text-sm text-neutral-500 dark:text-neutral-400">{PD.notifyNote}</p>
        ) : null}
        <Divider />

        {reservation && (
          <div className="flex flex-col divide-y divide-neutral-200 rounded-3xl border border-neutral-200 text-neutral-500 sm:flex-row sm:divide-x sm:divide-y-0 dark:divide-neutral-700 dark:border-neutral-700 dark:text-neutral-400">
            {isFlightBooking ? (
              <>
                <div className="flex flex-1 gap-x-4 p-5">
                  <HugeiconsIcon icon={Calendar04Icon} size={32} strokeWidth={1.5} />
                  <div className="flex flex-col">
                    <span className="text-sm text-neutral-400">{PD.flightDepartureLabel}</span>
                    <span className="mt-1.5 text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                      {formatCheckoutDate(
                        locale,
                        confirmExtra?.flight_departure_date ?? reservation.starts_on,
                      )}
                    </span>
                  </div>
                </div>
                <div className="flex flex-1 gap-x-4 p-5">
                  <HugeiconsIcon icon={Airplane01Icon} size={32} strokeWidth={1.5} />
                  <div className="flex flex-col">
                    <span className="text-sm text-neutral-400">{PD.flightRouteLabel}</span>
                    <span className="mt-1.5 text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                      {confirmExtra?.flight_route ?? '—'}
                    </span>
                    {confirmExtra?.flight_airline ? (
                      <span className="mt-1 text-sm text-neutral-500">{confirmExtra.flight_airline}</span>
                    ) : null}
                  </div>
                </div>
                <div className="flex flex-1 gap-x-4 p-5">
                  <HugeiconsIcon icon={UserIcon} size={32} strokeWidth={1.5} />
                  <div className="flex flex-col">
                    <span className="text-sm text-neutral-400">{PD.flightPassengerLabel}</span>
                    <span className="mt-1.5 text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                      {reservation.guest_name || reservation.guest_email}
                    </span>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="flex flex-1 gap-x-4 p-5">
                  <HugeiconsIcon icon={Calendar04Icon} size={32} strokeWidth={1.5} />
                  <div className="flex flex-col">
                    <span className="text-sm text-neutral-400">{PD.dateLabel}</span>
                    <span className="mt-1.5 text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                      {formatCheckoutDate(locale, reservation.starts_on)} –{' '}
                      {formatCheckoutDate(locale, reservation.ends_on)}
                    </span>
                  </div>
                </div>
                <div className="flex flex-1 gap-x-4 p-5">
                  <HugeiconsIcon icon={UserIcon} size={32} strokeWidth={1.5} />
                  <div className="flex flex-col">
                    <span className="text-sm text-neutral-400">{PD.guestLabel}</span>
                    <span className="mt-1.5 text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                      {reservation.guest_name || reservation.guest_email}
                    </span>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        <div>
          <h3 className="text-2xl font-semibold">
            {isFlightBooking ? PD.flightYourBooking : PD.yourBooking}
          </h3>
          <DescriptionList className="mt-5">
            {reservation?.id ? (
              <>
                <DescriptionTerm>{PD.reservationIdLabel}</DescriptionTerm>
                <DescriptionDetails>
                  <span className="font-mono text-xs text-neutral-700 dark:text-neutral-300">
                    {reservation.id}
                  </span>
                </DescriptionDetails>
              </>
            ) : null}
            {isFlightBooking && confirmExtra?.flight_airline ? (
              <>
                <DescriptionTerm>{PD.flightAirlineLabel}</DescriptionTerm>
                <DescriptionDetails>{confirmExtra.flight_airline}</DescriptionDetails>
              </>
            ) : null}
            {!isFlightBooking && (confirmExtra?.listing_title || confirmExtra?.listing_location) ? (
              <>
                <DescriptionTerm>{PD.listingTitleLabel}</DescriptionTerm>
                <DescriptionDetails>
                  {confirmExtra.listing_title ?? '—'}
                  {confirmExtra.listing_location ? (
                    <span className="mt-1 block text-sm text-neutral-500">
                      {confirmExtra.listing_location}
                    </span>
                  ) : null}
                </DescriptionDetails>
              </>
            ) : null}
            {hotelRoomName ? (
              <>
                <DescriptionTerm>{PD.hotelRoomLabel}</DescriptionTerm>
                <DescriptionDetails>{hotelRoomName}</DescriptionDetails>
              </>
            ) : null}
            {hotelBoardLabel ? (
              <>
                <DescriptionTerm>{PD.hotelBoardLabel}</DescriptionTerm>
                <DescriptionDetails>{hotelBoardLabel}</DescriptionDetails>
              </>
            ) : null}
            {guestSummary ? (
              <>
                <DescriptionTerm>{PD.guestLabel}</DescriptionTerm>
                <DescriptionDetails>{guestSummary}</DescriptionDetails>
              </>
            ) : null}
            <DescriptionTerm>{PD.codeLabel}</DescriptionTerm>
            <DescriptionDetails>
              <span className="font-mono text-neutral-900 dark:text-neutral-100">
                {reservation?.public_code ?? publicCode ?? '—'}
              </span>
            </DescriptionDetails>

            {reservation && (
              <>
                <DescriptionTerm>{PD.statusLabel}</DescriptionTerm>
                <DescriptionDetails>{checkoutStatusLabel(locale, reservation.status)}</DescriptionDetails>

                {isFlightBooking ? (
                  <>
                    <DescriptionTerm>{PD.flightDepartureLabel}</DescriptionTerm>
                    <DescriptionDetails>
                      {formatCheckoutDate(
                        locale,
                        confirmExtra?.flight_departure_date ?? reservation.starts_on,
                      )}
                    </DescriptionDetails>
                    {confirmExtra?.flight_route ? (
                      <>
                        <DescriptionTerm>{PD.flightRouteLabel}</DescriptionTerm>
                        <DescriptionDetails>{confirmExtra.flight_route}</DescriptionDetails>
                      </>
                    ) : null}
                    {turnaRefs?.pnr ? (
                      <>
                        <DescriptionTerm>{C.flightPnrLabel}</DescriptionTerm>
                        <DescriptionDetails>
                          <span className="font-mono font-semibold text-neutral-900 dark:text-neutral-100">
                            {turnaRefs.pnr}
                          </span>
                        </DescriptionDetails>
                      </>
                    ) : null}
                    {!turnaRefs?.pnr && turnaRefs?.systemRef ? (
                      <>
                        <DescriptionTerm>{C.flightRefLabel}</DescriptionTerm>
                        <DescriptionDetails>
                          <span className="font-mono font-semibold text-neutral-900 dark:text-neutral-100">
                            {turnaRefs.systemRef}
                          </span>
                        </DescriptionDetails>
                      </>
                    ) : null}
                  </>
                ) : (
                  <>
                    <DescriptionTerm>{PD.checkInLabel}</DescriptionTerm>
                    <DescriptionDetails>{formatCheckoutDate(locale, reservation.starts_on)}</DescriptionDetails>

                    <DescriptionTerm>{PD.checkOutLabel}</DescriptionTerm>
                    <DescriptionDetails>{formatCheckoutDate(locale, reservation.ends_on)}</DescriptionDetails>
                  </>
                )}

                {totalFromLines !== null && (
                  <>
                    <DescriptionTerm>{PD.totalLabel}</DescriptionTerm>
                    <DescriptionDetails>
                      {formatCheckoutMoney(
                        locale,
                        confirmExtra?.amount_total ?? totalFromLines,
                        (() => {
                          try {
                            const pb = JSON.parse(reservation.price_breakdown_json) as { currency?: string }
                            return pb.currency ?? 'TRY'
                          } catch {
                            return 'TRY'
                          }
                        })(),
                      )}
                    </DescriptionDetails>
                    {confirmExtra?.amount_paid != null ? (
                      <>
                        <DescriptionTerm>{PD.paidLabel}</DescriptionTerm>
                        <DescriptionDetails>
                          {formatCheckoutMoney(
                            locale,
                            confirmExtra.amount_paid,
                            'TRY',
                          )}
                        </DescriptionDetails>
                      </>
                    ) : null}
                    {confirmExtra?.amount_remaining != null && confirmExtra.amount_remaining > 0 ? (
                      <>
                        <DescriptionTerm>{PD.remainingLabel}</DescriptionTerm>
                        <DescriptionDetails>
                          {formatCheckoutMoney(
                            locale,
                            confirmExtra.amount_remaining,
                            'TRY',
                          )}
                        </DescriptionDetails>
                      </>
                    ) : null}
                  </>
                )}

                <DescriptionTerm>{PD.createdAtLabel}</DescriptionTerm>
                <DescriptionDetails>{formatCheckoutDate(locale, reservation.created_at)}</DescriptionDetails>
              </>
            )}
          </DescriptionList>
        </div>

        <div>
          <ButtonPrimary href={vitrinHref('/')}>
            <HugeiconsIcon icon={Home01Icon} className="size-5" strokeWidth={1.75} />
            {PD.homeButton}
          </ButtonPrimary>
        </div>
      </div>
    </main>
  )
}
