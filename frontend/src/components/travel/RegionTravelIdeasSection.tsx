import type { TravelIdea } from '@/lib/travel-api'
import { normalizeHrefForLocale } from '@/lib/i18n-config'
import { getMessages } from '@/utils/getT'
import { interpolate } from '@/utils/interpolate'
import clsx from 'clsx'
import Image from 'next/image'
import Link from 'next/link'

const DISPLAY_LIMIT = 5

const BADGE_THEMES = [
  'bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-100',
  'bg-emerald-50 text-emerald-900 dark:bg-emerald-950/55 dark:text-emerald-100',
  'bg-rose-50 text-rose-900 dark:bg-rose-950/50 dark:text-rose-100',
] as const

function formatTravelKm(km: number): string {
  if (!Number.isFinite(km) || km < 0) return ''
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`
}

function asFiniteKm(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'string') {
    const n = parseFloat(String(v).trim().replace(',', '.'))
    return Number.isFinite(n) ? n : null
  }
  return null
}

/** Bölge vitrinında gösterilecek mesafe: önce ilçe merkezine göre km, yoksa düz `distance_km`. */
function resolveTravelIdeaVenueDistanceKm(idea: TravelIdea): number | null {
  return (
    asFiniteKm(idea.distance_km_from_district) ??
    asFiniteKm(idea.distance_km) ??
    null
  )
}

export default function RegionTravelIdeasSection({
  ideas,
  locale,
  distanceTemplate,
  regionImageUrl,
  regionName,
}: {
  ideas: TravelIdea[]
  locale: string
  /** `{distance}` yer tutucusu — örn. il / ilçe / belde merkezine göre kuş uçuşu mesafe */
  distanceTemplate: string
  /** Sağ sütun — `travel_ideas_image_url` veya hero / galeri yedeği */
  regionImageUrl?: string | null
  regionName?: string
}) {
  if (!ideas.length) return null

  const copy = getMessages(locale).site.region
  const shown = ideas.slice(0, DISPLAY_LIMIT)
  const defaultBadges = copy.travelIdeaDefaultBadges

  const alt =
    regionName && regionName.trim()
      ? `${regionName} — ${copy.travelIdeasHeading}`
      : copy.travelIdeasHeading

  const imgSrc = regionImageUrl?.trim() ?? ''
  const isExternal = /^https?:\/\//i.test(imgSrc)

  return (
    <section className="bg-white py-14 dark:bg-neutral-900">
      <div className="container">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-start lg:gap-x-14 lg:gap-y-10 xl:gap-x-20">
          {/* Sol: başlık + en fazla 5 öğe (rozet + başlık + metin) */}
          <div className="min-w-0 lg:order-1">
            <h2 className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-white sm:text-4xl">
              {copy.travelIdeasHeading}
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-neutral-500 dark:text-neutral-400">
              {copy.travelIdeasSubheading}
            </p>

            <ul className="mt-12 flex flex-col gap-y-11 lg:mt-14">
              {shown.map((idea, i) => {
                const km = resolveTravelIdeaVenueDistanceKm(idea)
                const distLabel = km != null ? formatTravelKm(km) : ''
                const badgeText =
                  typeof idea.tag === 'string' && idea.tag.trim() !== ''
                    ? idea.tag.trim()
                    : defaultBadges[i % defaultBadges.length] ?? String(i + 1)

                return (
                  <li key={idea.id} className="flex flex-col gap-3">
                    <span
                      className={clsx(
                        'inline-flex w-fit rounded-full px-3 py-1 text-xs font-semibold',
                        BADGE_THEMES[i % BADGE_THEMES.length],
                      )}
                    >
                      {badgeText}
                    </span>
                    <h3 className="text-xl font-semibold text-neutral-900 dark:text-white">{idea.title}</h3>
                    {distLabel ? (
                      <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
                        {interpolate(distanceTemplate, { distance: distLabel })}
                      </p>
                    ) : null}
                    <p className="text-[15px] leading-relaxed text-neutral-600 dark:text-neutral-400">
                      {idea.summary}
                    </p>
                    {idea.link ? (
                      <Link
                        href={normalizeHrefForLocale(locale, idea.link)}
                        className="inline-flex w-fit pt-1 text-sm font-semibold text-[color:var(--primary-600,#0ea5e9)] hover:underline dark:text-sky-400"
                      >
                        {copy.travelIdeasReadMore}
                      </Link>
                    ) : null}
                  </li>
                )
              })}
            </ul>
          </div>

          {/* Sağ: bölge görseli — üst-sol + alt-sağ geniş radius (`asymmetric-image-corners`) */}
          <div className="relative min-w-0 lg:order-2 lg:sticky lg:top-28">
            <div className="relative mx-auto aspect-[4/5] w-full max-w-lg overflow-hidden asymmetric-image-corners lg:max-w-none lg:mx-0">
              {imgSrc ? (
                <Image
                  src={imgSrc}
                  alt={alt}
                  fill
                  sizes="(max-width: 1024px) 100vw, 44vw"
                  className="object-cover"
                  unoptimized={isExternal}
                  priority={false}
                />
              ) : (
                <div className="flex size-full items-center justify-center bg-gradient-to-br from-neutral-100 to-neutral-200 text-6xl dark:from-neutral-800 dark:to-neutral-900">
                  🗺️
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
