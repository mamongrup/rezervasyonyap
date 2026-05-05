import type { TravelIdea } from '@/lib/travel-api'
import { normalizeHrefForLocale } from '@/lib/i18n-config'
import { getMessages } from '@/utils/getT'
import { interpolate } from '@/utils/interpolate'
import clsx from 'clsx'
import Image from 'next/image'
import Link from 'next/link'

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
}: {
  ideas: TravelIdea[]
  locale: string
  /** `{distance}` yer tutucusu — örn. il / ilçe / belde merkezine göre kuş uçuşu mesafe */
  distanceTemplate: string
}) {
  if (!ideas.length) return null

  const copy = getMessages(locale).site.region

  return (
    <section className="bg-white py-14 dark:bg-neutral-900">
      <div className="container">
        <h2 className="mb-2 text-2xl font-bold text-neutral-900 dark:text-white">{copy.travelIdeasHeading}</h2>
        <p className="mb-10 text-sm text-neutral-500 dark:text-neutral-400">{copy.travelIdeasSubheading}</p>
        <div className="space-y-12">
          {ideas.map((idea, i) => (
            <article
              key={idea.id}
              className="grid gap-8 rounded-2xl border border-neutral-100 bg-neutral-50/80 p-6 md:grid-cols-2 md:items-stretch md:gap-10 dark:border-neutral-800 dark:bg-neutral-950/40"
            >
              <div className={clsx('flex flex-col justify-center', i % 2 === 1 && 'md:order-2')}>
                <h3 className="text-xl font-semibold text-neutral-900 dark:text-white">{idea.title}</h3>
                {(() => {
                  const km = resolveTravelIdeaVenueDistanceKm(idea)
                  const label = km != null ? formatTravelKm(km) : ''
                  if (!label) return null
                  return (
                    <p className="mt-2 text-sm font-medium text-neutral-600 dark:text-neutral-400">
                      {interpolate(distanceTemplate, { distance: label })}
                    </p>
                  )
                })()}
                <p className="mt-3 whitespace-pre-line text-neutral-600 dark:text-neutral-400">{idea.summary}</p>
                {idea.link ? (
                  <Link
                    href={normalizeHrefForLocale(locale, idea.link)}
                    className="mt-5 inline-flex w-fit text-sm font-semibold text-[color:var(--primary-600,#0ea5e9)] hover:underline dark:text-sky-400"
                  >
                    {copy.travelIdeasReadMore}
                  </Link>
                ) : null}
              </div>
              <div
                className={clsx(
                  'relative min-h-[200px] overflow-hidden rounded-2xl md:min-h-[260px]',
                  i % 2 === 1 && 'md:order-1',
                )}
              >
                {idea.image ? (
                  <Image
                    src={idea.image}
                    alt=""
                    fill
                    sizes="(max-width: 768px) 100vw, 50vw"
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full min-h-[200px] items-center justify-center bg-neutral-200/80 text-4xl dark:bg-neutral-800">
                    📷
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
