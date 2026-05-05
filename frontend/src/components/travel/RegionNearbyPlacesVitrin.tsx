import type { RegionPlaceData } from '@/app/api/region-places/route'
import Link from 'next/link'

import type { NearbyVitrinColumnsConfig } from '@/lib/nearby-vitrin-columns'
import { resolveNearbyVitrinForDisplay } from '@/lib/nearby-vitrin-columns'
import { getMessages } from '@/utils/getT'

export default function RegionNearbyPlacesVitrin({
  placesData,
  config,
  locale,
}: {
  placesData: RegionPlaceData
  config: NearbyVitrinColumnsConfig
  locale: string
}) {
  const copy = getMessages(locale).site.region
  const cols = resolveNearbyVitrinForDisplay(placesData, config)

  return (
    <section className="border-t border-neutral-100 bg-neutral-50/80 py-12 dark:border-neutral-800 dark:bg-neutral-950/40">
      <div className="container">
        <h2 className="mb-10 text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
          {copy.nearbyVitrinHeading}
        </h2>

        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-3 lg:gap-8">
          {cols.map((col) => (
            <div
              key={col.title}
              className="min-w-0 rounded-2xl border border-neutral-100 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900"
            >
              <h3 className="border-b border-neutral-100 pb-3 text-base font-semibold text-neutral-900 dark:border-neutral-800 dark:text-white">
                {col.title}
              </h3>
              <ul className="mt-4 flex flex-col gap-4">
                {col.cells.map((cell) => (
                  <li key={`${col.title}-${cell.rowLabel}`} className="flex flex-col gap-1">
                    <span className="text-xs font-semibold uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
                      {cell.rowLabel}
                    </span>
                    {cell.placeName && cell.distanceLabel ? (
                      cell.mapsHref ? (
                        <Link
                          href={cell.mapsHref}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="group flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5 hover:text-primary-600 dark:hover:text-primary-400"
                        >
                          <span className="min-w-0 flex-1 truncate text-sm font-medium text-neutral-900 dark:text-white">
                            {cell.placeName}
                          </span>
                          <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200">
                            {cell.distanceLabel}
                          </span>
                        </Link>
                      ) : (
                        <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5">
                          <span className="min-w-0 flex-1 truncate text-sm font-medium text-neutral-900 dark:text-white">
                            {cell.placeName}
                          </span>
                          <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200">
                            {cell.distanceLabel}
                          </span>
                        </div>
                      )
                    ) : (
                      <span className="text-sm text-neutral-400 dark:text-neutral-500">{copy.nearbyVitrinEmpty}</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
