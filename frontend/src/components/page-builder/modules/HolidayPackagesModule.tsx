import Link from 'next/link'

import { listPublicHolidayPackages, pickLocalizedName } from '@/lib/travel-api'
import { pickLocalized, type LocalizedText } from '@/lib/localized-text'

export interface HolidayPackagesConfig {
  title?: LocalizedText | string
  subheading?: LocalizedText | string
  limit?: number
  viewAllHref?: string
  viewAllLabel?: LocalizedText | string
}

const DEFAULT_TITLE: Record<string, string> = {
  tr: 'Hazır Tatil Paketleri',
  en: 'Holiday Packages',
  de: 'Urlaubspakete',
  ru: 'Готовые туры',
  zh: '度假套餐',
  fr: 'Forfaits Vacances',
}

const DEFAULT_VIEW_ALL: Record<string, string> = {
  tr: 'Tüm paketler',
  en: 'All packages',
  de: 'Alle Pakete',
  ru: 'Все туры',
  zh: '全部套餐',
  fr: 'Tous les forfaits',
}

interface BundleSummary {
  flightsCount: number
  hotelsCount: number
  toursCount: number
  totalDiscount?: number | string
}

function summarize(bundleJson: string): BundleSummary {
  const out: BundleSummary = { flightsCount: 0, hotelsCount: 0, toursCount: 0 }
  if (!bundleJson) return out
  try {
    const b = JSON.parse(bundleJson) as Record<string, unknown>
    if (Array.isArray(b.flights)) out.flightsCount = b.flights.length
    if (Array.isArray(b.hotels)) out.hotelsCount = b.hotels.length
    if (Array.isArray(b.tours)) out.toursCount = b.tours.length
    if (typeof b.discount_percent === 'number') out.totalDiscount = b.discount_percent
    if (typeof b.discount_percent === 'string' && b.discount_percent.trim()) out.totalDiscount = b.discount_percent
  } catch {
    /* noop */
  }
  return out
}

export default async function HolidayPackagesModule({
  config,
  locale = 'tr',
}: {
  config: HolidayPackagesConfig
  locale?: string
}) {
  const limit = Math.min(Math.max(config.limit ?? 6, 1), 50)
  const { packages } = await listPublicHolidayPackages({ limit })
  if (!packages.length) return null

  const title = pickLocalized(config.title, locale, DEFAULT_TITLE[locale] ?? DEFAULT_TITLE.tr)
  const subheading = pickLocalized(config.subheading, locale, '')
  const viewAllLabel = pickLocalized(
    config.viewAllLabel,
    locale,
    DEFAULT_VIEW_ALL[locale] ?? DEFAULT_VIEW_ALL.tr,
  )

  return (
    <section className="flex flex-col gap-6">
      <header className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-neutral-900 dark:text-white md:text-3xl">{title}</h2>
          {subheading && <p className="mt-1 text-neutral-600 dark:text-neutral-400">{subheading}</p>}
        </div>
        {config.viewAllHref && (
          <Link
            href={config.viewAllHref}
            className="text-sm font-semibold text-primary-600 hover:underline dark:text-primary-400"
          >
            {viewAllLabel} →
          </Link>
        )}
      </header>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {packages.map((p) => {
          const name = pickLocalizedName(p.name, p.name_translations, locale)
          const s = summarize(p.bundle_json)
          return (
            <article
              key={p.id}
              className="flex flex-col gap-3 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-neutral-800 dark:bg-neutral-900"
            >
              <h3 className="line-clamp-2 text-lg font-semibold text-neutral-900 dark:text-white">{name}</h3>
              <ul className="flex flex-wrap gap-2 text-xs text-neutral-600 dark:text-neutral-400">
                {s.flightsCount > 0 && (
                  <li className="rounded-md bg-neutral-100 px-2 py-1 dark:bg-neutral-800">
                    ✈ {s.flightsCount} {locale === 'en' ? 'flight' : 'uçuş'}
                  </li>
                )}
                {s.hotelsCount > 0 && (
                  <li className="rounded-md bg-neutral-100 px-2 py-1 dark:bg-neutral-800">
                    🏨 {s.hotelsCount} {locale === 'en' ? 'hotel' : 'otel'}
                  </li>
                )}
                {s.toursCount > 0 && (
                  <li className="rounded-md bg-neutral-100 px-2 py-1 dark:bg-neutral-800">
                    🗺 {s.toursCount} {locale === 'en' ? 'tour' : 'tur'}
                  </li>
                )}
              </ul>
              {s.totalDiscount && (
                <p className="text-sm font-bold text-rose-600 dark:text-rose-300">
                  {locale === 'en' ? `Save ${s.totalDiscount}%` : `%${s.totalDiscount} indirim`}
                </p>
              )}
            </article>
          )
        })}
      </div>
    </section>
  )
}
