'use client'

import {
  formatTourFlightDate,
  type TourFlightScheduleRow,
} from '@/lib/tour-flight-schedule'
import { LISTING_SECTION_STACKED } from '@/app/[locale]/(app)/(listings)/listing-section-classes'
import { getMessages } from '@/utils/getT'
import { useTourPeriodSelection } from './TourPeriodContext'
import { SectionHeading } from './components/SectionHeading'

function flightLegLabel(row: TourFlightScheduleRow, leg: 'out' | 'back'): string {
  if (leg === 'out') {
    return [row.departureFrom, row.departureTo, row.departureFlightNo].filter(Boolean).join(' · ') || '—'
  }
  return [row.returnFrom, row.returnTo, row.returnFlightNo].filter(Boolean).join(' · ') || '—'
}

export default function TourFlightScheduleSection({ locale = 'tr' }: { locale?: string }) {
  const { flightSchedules, selected, options } = useTourPeriodSelection()
  const fs = getMessages(locale).listing.tourDetail.flightSchedule

  if (flightSchedules.length === 0) return null

  const bookableCount = options.filter((p) => p.bookable !== false).length
  const highlightDate = selected?.startDate ?? null

  return (
    <section id="tour-section-flights" className={LISTING_SECTION_STACKED}>
      <SectionHeading>{fs.title}</SectionHeading>
      <p className="mb-4 text-sm text-neutral-600 dark:text-neutral-400">
        {fs.hint}{' '}
        {bookableCount < flightSchedules.length ? (
          <span className="text-neutral-500">{fs.passiveHint}</span>
        ) : null}
      </p>
      <div className="overflow-x-auto rounded-2xl border border-neutral-200 dark:border-neutral-700">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-neutral-50 text-neutral-600 dark:bg-neutral-800/80 dark:text-neutral-300">
            <tr>
              <th className="px-4 py-3 font-medium">{fs.colDeparture}</th>
              <th className="px-4 py-3 font-medium">{fs.colOutbound}</th>
              <th className="px-4 py-3 font-medium">{fs.colReturn}</th>
              <th className="px-4 py-3 font-medium">{fs.colReturnFlight}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200 dark:divide-neutral-700">
            {flightSchedules.map((row) => {
              const isSelected = highlightDate === row.departureDate
              const periodOpt = options.find((p) => p.startDate === row.departureDate)
              const isPassive = periodOpt?.bookable === false
              return (
                <tr
                  key={`${row.departureDate}-${row.returnDate}`}
                  className={
                    isSelected
                      ? 'bg-primary-50/80 dark:bg-primary-950/40'
                      : isPassive
                        ? 'text-neutral-400 dark:text-neutral-500'
                        : undefined
                  }
                >
                  <td className="px-4 py-3 whitespace-nowrap font-medium">
                    {formatTourFlightDate(row.departureDate)}
                    {isPassive ? (
                      <span className="ms-2 text-xs font-normal text-neutral-400">{fs.passiveBadge}</span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">{flightLegLabel(row, 'out')}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {formatTourFlightDate(row.returnDate)}
                  </td>
                  <td className="px-4 py-3">{flightLegLabel(row, 'back')}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}
