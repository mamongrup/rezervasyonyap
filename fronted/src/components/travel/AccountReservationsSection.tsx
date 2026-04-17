'use client'

import Link from 'next/link'
import type { MyReservationRow } from '@/lib/travel-api'
import { accountReservationListingHref } from '@/lib/account-reservation-listing-href'
import {
  bookingStatusBadgeClass,
  formatReservationDateOnly,
  formatReservationDateTime,
  formatReservationMoney,
  labeledStatus,
  paymentStatusBadgeClass,
} from '@/lib/account-reservation-display'
import type { getMessages } from '@/utils/getT'

type AccountPageT = ReturnType<typeof getMessages>['accountPage']

type Props = {
  locale: string
  reservations: MyReservationRow[]
  vitrinHref: (path: string) => string
  T: AccountPageT
}

export function AccountReservationsSection({ locale, reservations, vitrinHref, T }: Props) {
  return (
    <section id="reservations">
      <h2 className="text-2xl font-semibold">{T['My reservations']}</h2>
      <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">{T['Reservation hint']}</p>

      {reservations.length === 0 ? (
        <p className="mt-6 text-neutral-600 dark:text-neutral-400">{T['No reservations yet']}</p>
      ) : (
        <>
          <div className="mt-6 hidden md:block overflow-x-auto rounded-xl border border-neutral-200 dark:border-neutral-700">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-neutral-200 bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800/50">
                <tr>
                  <th className="px-4 py-3 font-medium">{T['Reservation code']}</th>
                  <th className="px-4 py-3 font-medium">{T.Listing}</th>
                  <th className="px-4 py-3 font-medium">{T.reservationColGuest}</th>
                  <th className="px-4 py-3 font-medium">{T['Date range']}</th>
                  <th className="px-4 py-3 font-medium">{T['Booking status']}</th>
                  <th className="px-4 py-3 font-medium">{T.reservationColPayment}</th>
                  <th className="px-4 py-3 font-medium">{T.reservationColAmount}</th>
                  <th className="px-4 py-3 font-medium">{T['Booked at']}</th>
                </tr>
              </thead>
              <tbody>
                {reservations.map((row) => (
                  <tr key={row.id} className="border-b border-neutral-100 dark:border-neutral-800">
                    <td className="px-4 py-3 font-mono text-xs align-top">{row.public_code}</td>
                    <td className="px-4 py-3 align-top">
                      {(row.listing_slug ?? '').trim() ? (
                        <Link
                          href={accountReservationListingHref(
                            row.listing_slug ?? '',
                            row.listing_category_code,
                            vitrinHref,
                          )}
                          className="font-mono text-xs text-primary-600 underline decoration-primary-600/30 underline-offset-2 hover:decoration-primary-600 dark:text-primary-400 dark:decoration-primary-400/30"
                        >
                          {row.listing_slug}
                        </Link>
                      ) : (
                        <span className="text-neutral-500">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 align-top text-neutral-800 dark:text-neutral-200">
                      {(row.guest_name ?? '').trim() || '—'}
                    </td>
                    <td className="px-4 py-3 align-top whitespace-nowrap">
                      {formatReservationDateOnly(row.starts_on, locale)} →{' '}
                      {formatReservationDateOnly(row.ends_on, locale)}
                    </td>
                    <td className="px-4 py-3 align-top">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${bookingStatusBadgeClass(row.status)}`}
                      >
                        {labeledStatus(row.status, 'bookingStatus', T as Record<string, string>)}
                      </span>
                    </td>
                    <td className="px-4 py-3 align-top">
                      {(row.payment_status ?? '').trim() ? (
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${paymentStatusBadgeClass(row.payment_status ?? '')}`}
                        >
                          {labeledStatus(row.payment_status, 'paymentStatus', T as Record<string, string>)}
                        </span>
                      ) : (
                        <span className="text-neutral-500">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 align-top tabular-nums">
                      {formatReservationMoney(row.amount_paid, row.currency_code, locale)}
                    </td>
                    <td className="px-4 py-3 align-top text-neutral-600 dark:text-neutral-400 whitespace-nowrap text-xs">
                      {formatReservationDateTime(row.created_at, locale)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="mt-6 space-y-4 md:hidden">
            {reservations.map((row) => (
              <li
                key={row.id}
                className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-700 dark:bg-neutral-900/40"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                      {T['Reservation code']}
                    </p>
                    <p className="font-mono text-sm">{row.public_code}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${bookingStatusBadgeClass(row.status)}`}
                    >
                      {labeledStatus(row.status, 'bookingStatus', T as Record<string, string>)}
                    </span>
                    {(row.payment_status ?? '').trim() ? (
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${paymentStatusBadgeClass(row.payment_status ?? '')}`}
                      >
                        {labeledStatus(row.payment_status, 'paymentStatus', T as Record<string, string>)}
                      </span>
                    ) : null}
                  </div>
                </div>
                <dl className="mt-4 space-y-2 text-sm">
                  <div className="flex justify-between gap-4">
                    <dt className="text-neutral-500">{T.Listing}</dt>
                    <dd className="text-right font-mono text-xs">
                      {(row.listing_slug ?? '').trim() ? (
                        <Link
                          href={accountReservationListingHref(
                            row.listing_slug ?? '',
                            row.listing_category_code,
                            vitrinHref,
                          )}
                          className="text-primary-600 underline dark:text-primary-400"
                        >
                          {row.listing_slug}
                        </Link>
                      ) : (
                        '—'
                      )}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-neutral-500">{T.reservationColGuest}</dt>
                    <dd className="text-right">{(row.guest_name ?? '').trim() || '—'}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-neutral-500">{T['Date range']}</dt>
                    <dd className="text-right">
                      {formatReservationDateOnly(row.starts_on, locale)} →{' '}
                      {formatReservationDateOnly(row.ends_on, locale)}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-neutral-500">{T.reservationColAmount}</dt>
                    <dd className="text-right tabular-nums">
                      {formatReservationMoney(row.amount_paid, row.currency_code, locale)}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-neutral-500">{T['Booked at']}</dt>
                    <dd className="text-right text-xs text-neutral-600 dark:text-neutral-400">
                      {formatReservationDateTime(row.created_at, locale)}
                    </dd>
                  </div>
                </dl>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  )
}
