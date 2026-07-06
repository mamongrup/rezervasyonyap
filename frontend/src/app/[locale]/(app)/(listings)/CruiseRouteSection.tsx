import { LISTING_SECTION_STACKED } from './listing-section-classes'
import { formatCruisePlaceName, parseCruiseRouteStops } from '@/lib/cruise-route-display'
import { getMessages } from '@/utils/getT'
import { MapPin } from 'lucide-react'

export default function CruiseRouteSection({
  routeSummary,
  locale = 'tr',
}: {
  routeSummary: string
  locale?: string
}) {
  const stops = parseCruiseRouteStops(routeSummary)
  if (stops.length === 0) return null

  const cd = getMessages(locale).listing.cruiseDetail

  return (
    <div className={LISTING_SECTION_STACKED}>
      <div className="rounded-2xl border border-neutral-200 bg-neutral-50/70 p-5 dark:border-neutral-700 dark:bg-neutral-900/50">
        <div className="mb-4 flex items-center gap-2">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-50 text-primary-600 dark:bg-primary-900/30 dark:text-primary-300">
            <MapPin className="h-5 w-5" aria-hidden />
          </span>
          <p className="text-xs font-medium uppercase tracking-wide text-neutral-400">{cd.route}</p>
        </div>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-2">
          {stops.map((stop, index) => (
            <span key={`${stop}:${index}`} className="inline-flex items-center gap-2">
              {index > 0 ? (
                <span className="text-sm font-medium text-neutral-300 dark:text-neutral-600" aria-hidden>
                  →
                </span>
              ) : null}
              <span className="rounded-full border border-neutral-200 bg-white px-4 py-2 text-sm font-semibold text-neutral-800 shadow-sm dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100">
                {formatCruisePlaceName(stop)}
              </span>
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
