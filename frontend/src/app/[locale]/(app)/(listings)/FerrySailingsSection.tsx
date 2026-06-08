import type { FerrySailings } from '@/lib/travel-api'
import { getMessages } from '@/utils/getT'
import { interpolate } from '@/utils/interpolate'

export default function FerrySailingsSection({
  sailings,
  locale = 'tr',
}: {
  sailings: FerrySailings
  locale?: string
}) {
  const fd = getMessages(locale).listing.ferryDetail
  const departures = sailings.departures?.filter(Boolean) ?? []
  if (departures.length === 0 && !sailings.vessel?.trim()) return null

  return (
    <div className="listingSection__wrap">
      <h2 className="text-xl font-semibold">{fd.sailingsTitle}</h2>
      <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">{fd.sailingsNote}</p>

      {departures.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {departures.map((time) => (
            <span
              key={time}
              className="inline-flex items-center rounded-full border border-neutral-200 bg-neutral-50 px-4 py-2 text-sm font-medium text-neutral-800 dark:border-neutral-600 dark:bg-neutral-800/60 dark:text-neutral-100"
            >
              {time}
            </span>
          ))}
        </div>
      ) : null}

      {sailings.vessel?.trim() ? (
        <p className="mt-4 text-sm text-neutral-600 dark:text-neutral-300">
          {interpolate(fd.vesselLabel, { name: sailings.vessel.trim() })}
        </p>
      ) : null}
    </div>
  )
}
