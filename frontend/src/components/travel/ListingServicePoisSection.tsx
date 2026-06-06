/**
 * İlan için temel ihtiyaç ve ulaşım mesafeleri.
 * Haritanın altında iki blok: "Temel İhtiyaçlar" + "Ulaşım"
 */
import { SectionHeading, SectionSubheading } from '@/app/[locale]/(app)/(listings)/components/SectionHeading'
import type { ServicePoi } from '@/lib/travel-api'
import { getMessages } from '@/utils/getT'
import { interpolate } from '@/utils/interpolate'
import { Divider } from '@/shared/divider'
import type { ReactNode } from 'react'
import {
  Bus,
  Car,
  Hospital,
  MapPin,
  Pill,
  PlaneTakeoff,
  ShoppingCart,
  Utensils,
} from 'lucide-react'

const ICON_MAP: Record<string, ReactNode> = {
  market: <ShoppingCart className="h-4 w-4" />,
  restoran: <Utensils className="h-4 w-4" />,
  eczane: <Pill className="h-4 w-4" />,
  hastane: <Hospital className="h-4 w-4" />,
  havalimani: <PlaneTakeoff className="h-4 w-4" />,
  otogar: <Car className="h-4 w-4" />,
  minibus: <Bus className="h-4 w-4" />,
}

function poiDefaultLabel(locale: string, type: string): string {
  const region = getMessages(locale).site.region
  const map: Record<string, string | undefined> = {
    market: region.nearbyVitrinRowMarket,
    restoran: region.nearbyVitrinRowRestaurants,
    eczane: region.nearbyVitrinRowPharmacy,
    havalimani: region.nearbyVitrinRowAirport,
    otogar: region.nearbyVitrinRowBusStation,
    minibus: region.nearbyVitrinRowMinibus,
  }
  return map[type] ?? type
}

function distanceLabel(locale: string, km: number): string {
  const sp = getMessages(locale).listing.servicePois
  return km < 1
    ? interpolate(sp.distanceMeters, { m: String(Math.round(km * 1000)) })
    : interpolate(sp.distanceKm, { km: km.toFixed(1) })
}

function PoiRow({ poi, locale }: { poi: ServicePoi; locale: string }) {
  const icon = ICON_MAP[poi.type] ?? <MapPin className="h-4 w-4" />
  const label = poi.label || poiDefaultLabel(locale, poi.type)
  return (
    <div className="flex items-center justify-between gap-2 border-b border-neutral-100 py-2.5 first:pt-0 last:border-0 last:pb-0 dark:border-neutral-800">
      <div className="flex items-center gap-2.5 text-neutral-700 dark:text-neutral-300">
        <span className="text-neutral-400 dark:text-neutral-500">{icon}</span>
        <span className="text-sm">{label}</span>
      </div>
      <div className="text-right">
        <span className="block text-sm font-semibold tabular-nums text-neutral-900 dark:text-white">
          {distanceLabel(locale, poi.distance_km)}
        </span>
        {poi.duration_text ? (
          <span className="block text-[11px] text-neutral-400 dark:text-neutral-500">
            {poi.duration_text}
          </span>
        ) : null}
      </div>
    </div>
  )
}

interface Props {
  amenities: ServicePoi[]
  transport: ServicePoi[]
  locale?: string
}

export default function ListingServicePoisSection({
  amenities,
  transport,
  locale = 'tr',
}: Props) {
  if (!amenities.length && !transport.length) return null

  const sp = getMessages(locale).listing.servicePois
  const region = getMessages(locale).site.region

  return (
    <section className="listingSection__wrap">
      <div>
        <SectionHeading>{sp.title}</SectionHeading>
        <SectionSubheading>{sp.subtitle}</SectionSubheading>
      </div>
      <Divider className="w-14!" />
      <div className="grid gap-6 sm:grid-cols-2">
        {amenities.length > 0 && (
          <div className="rounded-2xl border border-neutral-100 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900/40">
            <h3 className="mb-3 text-base font-semibold text-neutral-900 dark:text-white">
              {region.nearbyVitrinColEssentials}
            </h3>
            <div>
              {amenities.map((p) => (
                <PoiRow key={p.type} poi={p} locale={locale} />
              ))}
            </div>
          </div>
        )}

        {transport.length > 0 && (
          <div className="rounded-2xl border border-neutral-100 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900/40">
            <h3 className="mb-3 text-base font-semibold text-neutral-900 dark:text-white">
              {region.nearbyVitrinColTransport}
            </h3>
            <div>
              {transport.map((p) => (
                <PoiRow key={p.type} poi={p} locale={locale} />
              ))}
            </div>
          </div>
        )}
      </div>
      <p className="mt-1 text-[11px] text-neutral-400 dark:text-neutral-500">{sp.footnote}</p>
    </section>
  )
}
