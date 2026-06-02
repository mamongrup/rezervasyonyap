import {
  formatTourFlightDate,
  type TourFlightScheduleRow,
} from '@/lib/tour-flight-schedule'
import { SectionHeading } from './components/SectionHeading'

export default function TourFlightScheduleSection({
  rows,
  bookablePeriodCount,
}: {
  rows: TourFlightScheduleRow[]
  bookablePeriodCount: number
}) {
  if (rows.length === 0) return null

  const showBookingNote = bookablePeriodCount > 0 && rows.length > bookablePeriodCount

  return (
    <section id="tour-section-flights" className="listingSection__wrap scroll-mt-28">
      <SectionHeading>Planlanan kalkış tarihleri</SectionHeading>
      {showBookingNote ? (
        <p className="mb-4 text-sm text-neutral-600 dark:text-neutral-400">
          Bu tablo tur programındaki <strong>tüm planlanan uçuş kalkışlarını</strong> listeler (
          {rows.length} tarih). Online rezervasyon kutusunda yalnızca Wtatil&apos;de{' '}
          <strong>satışa açık dönemler</strong> görünür
          {bookablePeriodCount === 1 ? ' (şu an 1 dönem)' : ` (${bookablePeriodCount} dönem)`}.
        </p>
      ) : null}
      <div className="overflow-x-auto rounded-2xl border border-neutral-200 dark:border-neutral-700">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-neutral-50 text-neutral-600 dark:bg-neutral-800/80 dark:text-neutral-300">
            <tr>
              <th className="px-4 py-3 font-medium">Kalkış</th>
              <th className="px-4 py-3 font-medium">Gidiş uçuşu</th>
              <th className="px-4 py-3 font-medium">Dönüş</th>
              <th className="px-4 py-3 font-medium">Dönüş uçuşu</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200 dark:divide-neutral-700">
            {rows.map((row) => (
              <tr key={`${row.departureDate}-${row.returnDate}`}>
                <td className="px-4 py-3 whitespace-nowrap">
                  {formatTourFlightDate(row.departureDate)}
                </td>
                <td className="px-4 py-3 text-neutral-600 dark:text-neutral-400">
                  {[row.departureFrom, row.departureTo, row.departureFlightNo]
                    .filter(Boolean)
                    .join(' · ') || '—'}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  {formatTourFlightDate(row.returnDate)}
                </td>
                <td className="px-4 py-3 text-neutral-600 dark:text-neutral-400">
                  {[row.returnFrom, row.returnTo, row.returnFlightNo].filter(Boolean).join(' · ') ||
                    '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
