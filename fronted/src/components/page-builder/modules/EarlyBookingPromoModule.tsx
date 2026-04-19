import Link from 'next/link'

import { listPublicActiveCampaigns, pickLocalizedName } from '@/lib/travel-api'
import { pickLocalized, type LocalizedText } from '@/lib/localized-text'

export interface EarlyBookingPromoConfig {
  title?: LocalizedText | string
  subheading?: LocalizedText | string
  ctaHref?: string
  ctaLabel?: LocalizedText | string
  /** Vurgu rengi (Tailwind gradient sınıfı) */
  gradient?: string
}

const DEFAULT_TITLE: Record<string, string> = {
  tr: 'Erken Rezervasyon Avantajı',
  en: 'Early Booking Advantage',
  de: 'Frühbucher-Vorteil',
  ru: 'Раннее бронирование',
  zh: '早订优惠',
  fr: 'Avantage Réservation Anticipée',
}

const DEFAULT_CTA: Record<string, string> = {
  tr: 'İncele',
  en: 'Browse',
  de: 'Ansehen',
  ru: 'Смотреть',
  zh: '查看',
  fr: 'Découvrir',
}

function describe(rulesJson: string, locale: string): string {
  try {
    const r = JSON.parse(rulesJson) as { discount_percent?: number | string; days_before?: number }
    const pct = typeof r.discount_percent === 'number' ? r.discount_percent : Number(r.discount_percent ?? 0)
    const days = r.days_before ?? 0
    if (pct && days) {
      if (locale === 'en') return `Book ${days} days early → save ${pct}%`
      if (locale === 'de') return `${days} Tage vorher buchen → ${pct}% sparen`
      if (locale === 'ru') return `Бронируйте за ${days} дней → скидка ${pct}%`
      if (locale === 'zh') return `提前 ${days} 天预订 → 立减 ${pct}%`
      if (locale === 'fr') return `Réservez ${days} jours avant → ${pct}% de remise`
      return `${days} gün önceden rezerve et → %${pct} indirim`
    }
    if (pct) {
      if (locale === 'en') return `Save up to ${pct}% with early booking`
      return `Erken rezervasyona %${pct}'ye varan indirim`
    }
  } catch {
    /* noop */
  }
  return locale === 'en' ? 'Save more by booking earlier.' : 'Erken rezerve edin, daha fazla kazanın.'
}

export default async function EarlyBookingPromoModule({
  config,
  locale = 'tr',
}: {
  config: EarlyBookingPromoConfig
  locale?: string
}) {
  const { campaigns } = await listPublicActiveCampaigns({ type: 'early_booking', limit: 3 })
  const top = campaigns[0]
  if (!top) return null

  const title = pickLocalized(config.title, locale, DEFAULT_TITLE[locale] ?? DEFAULT_TITLE.tr)
  const subheading =
    pickLocalized(config.subheading, locale, '') ||
    pickLocalizedName(top.name, top.name_translations, locale)
  const ctaLabel = pickLocalized(config.ctaLabel, locale, DEFAULT_CTA[locale] ?? DEFAULT_CTA.tr)
  const gradient = config.gradient ?? 'from-emerald-500 to-teal-600'
  const desc = describe(top.rules_json, locale)

  return (
    <section
      className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${gradient} p-8 text-white shadow-xl md:p-12`}
    >
      <div className="relative z-10 flex flex-col items-start gap-6 md:flex-row md:items-center md:justify-between">
        <div className="max-w-2xl">
          <p className="mb-2 inline-block rounded-full bg-white/20 px-3 py-1 text-xs font-semibold uppercase tracking-wide backdrop-blur">
            {top.code}
          </p>
          <h2 className="text-2xl font-bold md:text-3xl">{title}</h2>
          <p className="mt-2 text-white/90">{subheading}</p>
          <p className="mt-3 text-lg font-semibold">{desc}</p>
        </div>
        {config.ctaHref && (
          <Link
            href={config.ctaHref}
            className="shrink-0 rounded-xl bg-white px-6 py-3 font-semibold text-neutral-800 transition hover:bg-neutral-100"
          >
            {ctaLabel}
          </Link>
        )}
      </div>
    </section>
  )
}
