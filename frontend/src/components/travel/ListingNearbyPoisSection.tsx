/**
 * İlana ait önceden hesaplanmış yakın mekan mesafeleri.
 * listings.nearby_pois_json → sunucu tarafında Haversine (PostgreSQL) ile doldurulur.
 * blog_slug varsa ilgili blog yazısına, yoksa Google Maps'e bağlanır.
 */
import NearbyPoiCardImage from '@/components/travel/NearbyPoiCardImage'
import type { NearbyPoi } from '@/lib/travel-api'
import { getMessages } from '@/utils/getT'
import { interpolate } from '@/utils/interpolate'
import { BookOpen, MapPin } from 'lucide-react'
import Link from 'next/link'

function formatPoiDistance(km: number, locale: string): string {
  if (!Number.isFinite(km) || km <= 0) return ''
  const sp = getMessages(locale).listing.servicePois
  return km < 1
    ? interpolate(sp.distanceMeters, { m: String(Math.round(km * 1000)) })
    : interpolate(sp.distanceKm, { km: km.toFixed(km >= 10 ? 0 : 1) })
}


interface Props {
  pois: NearbyPoi[]
  title?: string
  locale?: string
}

export default function ListingNearbyPoisSection({ pois, title, locale }: Props) {
  if (!pois.length) return null

  const lang = locale ?? 'tr'

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
            <NearbyPoiCardImage src={poi.image} alt={poi.title} />

            <div className="min-w-0 flex-1">
              <div className="flex items-start gap-2">
                {poi.blog_slug ? (
                  <Link
                    href={`/${lang}/blog/${poi.blog_slug}`}
                    className="text-sm font-semibold leading-tight text-neutral-900 hover:text-primary-600 dark:text-white dark:hover:text-neutral-200"
                  >
                    {poi.title}
                  </Link>
                ) : (
                  <p className="text-sm font-semibold leading-tight text-neutral-900 dark:text-white">
                    {poi.title}
                  </p>
                )}
              </div>
              {poi.distance_km > 0 ? (
                <p className="mt-1 text-xs font-medium tabular-nums text-primary-700 dark:text-primary-300">
                  {formatPoiDistance(poi.distance_km, lang)}
                </p>
              ) : null}
              {poi.summary ? (
                <p className="mt-1 line-clamp-2 text-xs text-neutral-500 dark:text-neutral-400">
                  {poi.summary}
                </p>
              ) : null}
              <div className="mt-1.5 flex items-center gap-3">
                {poi.blog_slug ? (
                  <Link
                    href={`/${lang}/blog/${poi.blog_slug}`}
                    className="inline-flex items-center gap-1 text-[11px] text-link-muted-underline"
                  >
                    <BookOpen className="h-3 w-3" />
                    Devamını Oku
                  </Link>
                ) : null}
                {poi.link ? (
                  <Link
                    href={poi.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-neutral-400 hover:underline dark:text-neutral-500"
                  >
                    <MapPin className="h-3 w-3" />
                    Haritada Gör
                  </Link>
                ) : null}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
