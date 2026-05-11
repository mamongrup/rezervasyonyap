/**
 * İlan için temel ihtiyaç ve ulaşım mesafeleri.
 * Haritanın altında iki blok: "Temel İhtiyaçlar" + "Ulaşım"
 * Veriler: listings.amenities_pois_json + transport_pois_json
 */
import type { ServicePoi } from '@/lib/travel-api'
import {
  Bus,
  Car,
  Coffee,
  Hospital,
  MapPin,
  Pill,
  PlaneTakeoff,
  ShoppingCart,
  Utensils,
} from 'lucide-react'

const ICON_MAP: Record<string, React.ReactNode> = {
  market: <ShoppingCart className="h-4 w-4" />,
  restoran: <Utensils className="h-4 w-4" />,
  cafe: <Coffee className="h-4 w-4" />,
  eczane: <Pill className="h-4 w-4" />,
  hastane: <Hospital className="h-4 w-4" />,
  havalimani: <PlaneTakeoff className="h-4 w-4" />,
  otogar: <Car className="h-4 w-4" />,
  minibus: <Bus className="h-4 w-4" />,
}

const DEFAULT_LABELS: Record<string, string> = {
  market: 'Market',
  restoran: 'Restoran',
  cafe: 'Kafe',
  eczane: 'Eczane',
  hastane: 'Hastane',
  havalimani: 'Havalimanı',
  otogar: 'Otogar',
  minibus: 'Minibüs / Dolmuş',
}

function distanceLabel(km: number): string {
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`
}

function PoiRow({ poi }: { poi: ServicePoi }) {
  const icon = ICON_MAP[poi.type] ?? <MapPin className="h-4 w-4" />
  const label = poi.label || DEFAULT_LABELS[poi.type] || poi.type
  return (
    <div className="flex items-center justify-between gap-2 py-2.5 first:pt-0 last:pb-0 border-b border-neutral-100 last:border-0 dark:border-neutral-800">
      <div className="flex items-center gap-2.5 text-neutral-700 dark:text-neutral-300">
        <span className="text-neutral-400 dark:text-neutral-500">{icon}</span>
        <span className="text-sm">{label}</span>
      </div>
      <div className="text-right">
        <span className="block text-sm font-semibold tabular-nums text-neutral-900 dark:text-white">
          {distanceLabel(poi.distance_km)}
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
}

export default function ListingServicePoisSection({ amenities, transport }: Props) {
  if (!amenities.length && !transport.length) return null

  return (
    <section className="listingSection__wrap">
      <div>
        <h2 className="text-2xl font-semibold text-neutral-900 dark:text-white">Mesafeler</h2>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          Yol mesafesi · sürüş süresi araçla tahminidir.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        {amenities.length > 0 && (
          <div className="rounded-2xl border border-neutral-100 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900/40">
            <h3 className="mb-3 text-base font-semibold text-neutral-900 dark:text-white">
              Temel İhtiyaçlar
            </h3>
            <div>
              {amenities.map((p) => (
                <PoiRow key={p.type} poi={p} />
              ))}
            </div>
          </div>
        )}

        {transport.length > 0 && (
          <div className="rounded-2xl border border-neutral-100 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900/40">
            <h3 className="mb-3 text-base font-semibold text-neutral-900 dark:text-white">
              Ulaşım
            </h3>
            <div>
              {transport.map((p) => (
                <PoiRow key={p.type} poi={p} />
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
