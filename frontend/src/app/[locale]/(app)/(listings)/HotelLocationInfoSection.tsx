import { Divider } from '@/shared/divider'
import { getMessages } from '@/utils/getT'
import { interpolate } from '@/utils/interpolate'
import { MapPin, Plane, Route, TrainFront } from 'lucide-react'
import { SectionHeading, SectionSubheading } from './components/SectionHeading'

type ServicePoi = {
  type: string
  label?: string
  distance_km: number
  duration_text?: string
}

function formatDistance(km: number, locale: string): string {
  if (!Number.isFinite(km)) return ''
  const sp = getMessages(locale).listing.servicePois
  if (km < 1) return interpolate(sp.distanceMeters, { m: String(Math.round(km * 1000)) })
  return interpolate(sp.distanceKm, { km: km.toFixed(km >= 10 ? 0 : 1) })
}

function iconFor(type: string) {
  if (/airport|havaliman|uçak|ucak/i.test(type)) return Plane
  if (/bus|train|station|otogar|gar|metro/i.test(type)) return TrainFront
  return Route
}

export default function HotelLocationInfoSection({
  locale = 'tr',
  title,
  subtitle,
  address,
  city,
  transport,
}: {
  locale?: string
  title?: string
  subtitle?: string
  address?: string | null
  city?: string | null
  transport: ServicePoi[]
}) {
  const hd = getMessages(locale).listing.hotelDetail
  const resolvedTitle = title ?? hd?.locationTitle ?? 'Konum Bilgileri'
  const resolvedSubtitle = subtitle ?? hd?.locationSubtitle ?? ''
  const locationFallback = hd?.locationFallback ?? 'Konum'
  const rows = transport
    .filter((p) => p.label?.trim() && Number.isFinite(p.distance_km))
    .slice(0, 6)

  if (!address?.trim() && !city?.trim() && rows.length === 0) return null

  return (
    <section className="listingSection__wrap">
      <div>
        <SectionHeading>{resolvedTitle}</SectionHeading>
        <SectionSubheading>{resolvedSubtitle}</SectionSubheading>
      </div>
      <Divider className="w-14!" />
      <div className="grid gap-4 md:grid-cols-[1.1fr_1fr]">
        <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-5 dark:border-neutral-700 dark:bg-neutral-900/50">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-50 text-primary-600 dark:bg-primary-900/30 dark:text-primary-300">
              <MapPin className="h-5 w-5" aria-hidden />
            </span>
            <div>
              <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                {city?.trim() || locationFallback}
              </p>
              {address?.trim() ? (
                <p className="mt-1 text-sm leading-relaxed text-neutral-600 dark:text-neutral-300">
                  {address.trim()}
                </p>
              ) : null}
            </div>
          </div>
        </div>
        {rows.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-1">
            {rows.map((poi) => {
              const Icon = iconFor(`${poi.type} ${poi.label ?? ''}`)
              return (
                <div
                  key={`${poi.type}:${poi.label}`}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm dark:border-neutral-700 dark:bg-neutral-800/40"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <Icon className="h-4 w-4 shrink-0 text-neutral-400" aria-hidden />
                    <span className="truncate text-neutral-700 dark:text-neutral-200">{poi.label}</span>
                  </div>
                  <span className="shrink-0 font-semibold text-neutral-900 dark:text-neutral-100">
                    {poi.duration_text?.trim() || formatDistance(poi.distance_km, locale)}
                  </span>
                </div>
              )
            })}
          </div>
        ) : null}
      </div>
    </section>
  )
}
