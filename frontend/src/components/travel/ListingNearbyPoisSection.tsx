/**
 * İlana ait önceden hesaplanmış yakın mekan mesafeleri.
 * listings.nearby_pois_json → sunucu tarafında Haversine (PostgreSQL) ile doldurulur.
 */
import type { NearbyPoi } from '@/lib/travel-api'
import { MapPin } from 'lucide-react'
import Link from 'next/link'

function distanceLabel(km: number): string {
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`
}

function distanceBadgeClass(km: number): string {
  if (km < 2) return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
  if (km < 10) return 'bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300'
  return 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400'
}

interface Props {
  pois: NearbyPoi[]
  title?: string
}

export default function ListingNearbyPoisSection({ pois, title }: Props) {
  if (!pois.length) return null

  return (
    <section className="listingSection__wrap">
      <div>
        <h2 className="text-2xl font-semibold text-neutral-900 dark:text-white">
          {title ?? 'Yakındaki Gezilecek Yerler'}
        </h2>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          Tesisten kuş uçuşu mesafeye göre sıralanmıştır.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {pois.map((poi, i) => (
          <div
            key={poi.place_id ?? i}
            className="flex gap-3 rounded-2xl border border-neutral-100 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900/40"
          >
            {poi.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={poi.image}
                alt={poi.title}
                className="h-16 w-16 shrink-0 rounded-xl object-cover"
                loading="lazy"
              />
            ) : (
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-neutral-100 dark:bg-neutral-800">
                <MapPin className="h-6 w-6 text-neutral-400" />
              </div>
            )}

            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-semibold leading-tight text-neutral-900 dark:text-white">
                  {poi.title}
                </p>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${distanceBadgeClass(poi.distance_km)}`}
                >
                  {distanceLabel(poi.distance_km)}
                </span>
              </div>
              {poi.summary ? (
                <p className="mt-1 line-clamp-2 text-xs text-neutral-500 dark:text-neutral-400">
                  {poi.summary}
                </p>
              ) : null}
              {poi.link ? (
                <Link
                  href={poi.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-medium text-primary-600 hover:underline dark:text-primary-400"
                >
                  <MapPin className="h-3 w-3" />
                  Haritada Gör
                </Link>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
