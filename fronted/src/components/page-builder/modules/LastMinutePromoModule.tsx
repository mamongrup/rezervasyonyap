import Link from 'next/link'

import { listPublicActiveCampaigns, pickLocalizedName } from '@/lib/travel-api'
import { pickLocalized, type LocalizedText } from '@/lib/localized-text'

import LastMinuteCountdown from './LastMinuteCountdown'

export interface LastMinutePromoConfig {
  title?: LocalizedText | string
  subheading?: LocalizedText | string
  ctaHref?: string
  ctaLabel?: LocalizedText | string
  gradient?: string
}

const DEFAULT_TITLE: Record<string, string> = {
  tr: 'Son Dakika Fırsatı',
  en: 'Last Minute Deals',
  de: 'Last-Minute-Angebote',
  ru: 'Горящие предложения',
  zh: '最后一分钟特惠',
  fr: 'Offres de dernière minute',
}

const DEFAULT_CTA: Record<string, string> = {
  tr: 'Hemen Yakala',
  en: 'Grab Now',
  de: 'Jetzt sichern',
  ru: 'Забронировать',
  zh: '立即预订',
  fr: 'En profiter',
}

export default async function LastMinutePromoModule({
  config,
  locale = 'tr',
}: {
  config: LastMinutePromoConfig
  locale?: string
}) {
  const { campaigns } = await listPublicActiveCampaigns({ type: 'last_minute', limit: 1 })
  const top = campaigns[0]
  if (!top) return null

  const title = pickLocalized(config.title, locale, DEFAULT_TITLE[locale] ?? DEFAULT_TITLE.tr)
  const subheading =
    pickLocalized(config.subheading, locale, '') ||
    pickLocalizedName(top.name, top.name_translations, locale)
  const ctaLabel = pickLocalized(config.ctaLabel, locale, DEFAULT_CTA[locale] ?? DEFAULT_CTA.tr)
  const gradient = config.gradient ?? 'from-rose-500 via-orange-500 to-amber-500'

  return (
    <section
      className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${gradient} p-8 text-white shadow-xl md:p-12`}
    >
      <div className="relative z-10 grid gap-6 md:grid-cols-[1fr_auto] md:items-center">
        <div className="max-w-2xl">
          <p className="mb-2 inline-block rounded-full bg-white/20 px-3 py-1 text-xs font-semibold uppercase tracking-wide backdrop-blur">
            ⚡ {top.code}
          </p>
          <h2 className="text-2xl font-bold md:text-3xl">{title}</h2>
          <p className="mt-2 text-white/90">{subheading}</p>
          {top.ends_at && (
            <div className="mt-4">
              <LastMinuteCountdown endsAt={top.ends_at} locale={locale} />
            </div>
          )}
        </div>
        {config.ctaHref && (
          <Link
            href={config.ctaHref}
            className="rounded-xl bg-white px-6 py-3 text-center font-semibold text-neutral-800 transition hover:bg-neutral-100"
          >
            {ctaLabel}
          </Link>
        )}
      </div>
    </section>
  )
}
