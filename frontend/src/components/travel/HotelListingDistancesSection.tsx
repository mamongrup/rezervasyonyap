import type { ReactNode } from 'react'
import { Binoculars, Info, Landmark, PlaneTakeoff } from 'lucide-react'
import { getMessages } from '@/utils/getT'
import { interpolate } from '@/utils/interpolate'

export type HotelDistanceItem = {
  name: string
  distanceKm: number
}

function formatDistance(locale: string, km: number): string {
  const sp = getMessages(locale).listing.servicePois
  return km < 1
    ? interpolate(sp.distanceMeters, { m: String(Math.round(km * 1000)) })
    : interpolate(sp.distanceKm, { km: km.toFixed(1) })
}

function DistanceColumn({
  icon,
  title,
  items,
  locale,
}: {
  icon: ReactNode
  title: string
  items: HotelDistanceItem[]
  locale: string
}) {
  if (!items.length) return null

  return (
    <div className="min-w-0 rounded-2xl border border-neutral-100 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900/40">
      <div className="mb-3 flex items-center gap-2.5 border-b border-neutral-100 pb-3 dark:border-neutral-800">
        <span className="text-primary-600 dark:text-primary-400">{icon}</span>
        <h3 className="text-base font-semibold text-neutral-900 dark:text-white">{title}</h3>
      </div>
      <ul className="flex flex-col">
        {items.map((item, index) => (
          <li
            key={`${title}-${item.name}-${index}`}
            className="flex items-start justify-between gap-3 border-b border-neutral-100 py-2.5 first:pt-0 last:border-0 last:pb-0 dark:border-neutral-800"
          >
            <span className="min-w-0 text-sm leading-snug text-neutral-700 dark:text-neutral-300">
              {item.name}
            </span>
            <span className="shrink-0 text-sm font-semibold tabular-nums text-neutral-900 dark:text-white">
              {formatDistance(locale, item.distanceKm)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

interface Props {
  historicPlaces: HotelDistanceItem[]
  surroundings: HotelDistanceItem[]
  transport: HotelDistanceItem[]
  locale?: string
}

export default function HotelListingDistancesSection({
  historicPlaces,
  surroundings,
  transport,
  locale = 'tr',
}: Props) {
  const hd = getMessages(locale).listing.hotelDetail
  const hdFallback = getMessages('en').listing.hotelDetail
  const columns = [
    {
      key: 'historic',
      icon: <Landmark className="h-5 w-5" aria-hidden />,
      title: hd?.distancesColHistoric ?? hdFallback.distancesColHistoric,
      items: historicPlaces,
    },
    {
      key: 'surroundings',
      icon: <Binoculars className="h-5 w-5" aria-hidden />,
      title: hd?.distancesColSurroundings ?? hdFallback.distancesColSurroundings,
      items: surroundings,
    },
    {
      key: 'transport',
      icon: <PlaneTakeoff className="h-5 w-5" aria-hidden />,
      title: hd?.distancesColTransport ?? hdFallback.distancesColTransport,
      items: transport,
    },
  ].filter((col) => col.items.length > 0)

  if (columns.length === 0) return null

  const footnote = hd?.distancesFootnote ?? hdFallback.distancesFootnote

  return (
    <div className="space-y-3">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {columns.map((col) => (
          <DistanceColumn
            key={col.key}
            icon={col.icon}
            title={col.title}
            items={col.items}
            locale={locale}
          />
        ))}
      </div>
      <p className="flex items-start gap-1.5 text-[11px] leading-relaxed text-neutral-400 dark:text-neutral-500">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
        <span>{footnote}</span>
      </p>
    </div>
  )
}
