import Link from 'next/link'

import { listPublicActiveCampaigns, pickLocalizedName, type Campaign } from '@/lib/travel-api'
import { pickLocalized, type LocalizedText } from '@/lib/localized-text'

export interface ActiveCampaignsConfig {
  title?: LocalizedText | string
  subheading?: LocalizedText | string
  /** Belirli bir campaign_type ile filtre. Boşsa hepsi. */
  campaignType?: string
  /** Maks. kart sayısı (varsayılan 6, üst sınır 100) */
  limit?: number
  /** "Tümünü gör" linki — varsayılan /tr/kampanyalar */
  viewAllHref?: string
  /** "Tümünü gör" metni (locale'e göre) */
  viewAllLabel?: LocalizedText | string
  /** Görsel paleti */
  accentClass?: string
}

const DEFAULT_TITLES: Record<string, string> = {
  tr: 'Aktif Kampanyalar',
  en: 'Active Campaigns',
  de: 'Aktive Kampagnen',
  ru: 'Активные акции',
  zh: '正在进行的活动',
  fr: 'Campagnes actives',
}

const DEFAULT_VIEW_ALL: Record<string, string> = {
  tr: 'Tüm kampanyalar',
  en: 'All campaigns',
  de: 'Alle Kampagnen',
  ru: 'Все акции',
  zh: '查看全部',
  fr: 'Toutes les campagnes',
}

function pickRules(rulesJson: string): { discount?: string; minNights?: number } {
  if (!rulesJson) return {}
  try {
    const parsed = JSON.parse(rulesJson) as Record<string, unknown>
    const out: { discount?: string; minNights?: number } = {}
    if (typeof parsed.discount_percent === 'number') {
      out.discount = `%${parsed.discount_percent}`
    } else if (typeof parsed.discount_percent === 'string' && parsed.discount_percent.trim()) {
      out.discount = `%${parsed.discount_percent}`
    } else if (typeof parsed.discount === 'string') {
      out.discount = parsed.discount
    }
    if (typeof parsed.min_nights === 'number') out.minNights = parsed.min_nights
    return out
  } catch {
    return {}
  }
}

function CampaignCard({ c, locale, accent }: { c: Campaign; locale: string; accent: string }) {
  const title = pickLocalizedName(c.name, c.name_translations, locale)
  const rules = pickRules(c.rules_json)
  return (
    <article
      className={`group relative flex flex-col gap-3 overflow-hidden rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-neutral-800 dark:bg-neutral-900 ${accent}`}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="rounded-md bg-neutral-100 px-2 py-1 text-xs font-mono text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200">
          {c.code}
        </span>
        {rules.discount && (
          <span className="rounded-md bg-rose-50 px-2 py-1 text-xs font-bold text-rose-600 dark:bg-rose-950 dark:text-rose-300">
            {rules.discount}
          </span>
        )}
      </div>
      <h3 className="line-clamp-2 text-lg font-semibold text-neutral-900 dark:text-white">{title}</h3>
      {rules.minNights ? (
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          {locale === 'en' ? `Min. ${rules.minNights} nights` : `Min. ${rules.minNights} gece`}
        </p>
      ) : null}
      <div className="mt-auto text-xs text-neutral-500 dark:text-neutral-500">
        {c.ends_at ? `${locale === 'en' ? 'Ends' : 'Bitiş'}: ${c.ends_at.slice(0, 10)}` : null}
      </div>
    </article>
  )
}

export default async function ActiveCampaignsModule({
  config,
  locale = 'tr',
}: {
  config: ActiveCampaignsConfig
  locale?: string
}) {
  const limit = Math.min(Math.max(config.limit ?? 6, 1), 100)
  const { campaigns } = await listPublicActiveCampaigns({
    type: config.campaignType,
    limit,
  })
  if (!campaigns.length) return null

  const title = pickLocalized(config.title, locale, DEFAULT_TITLES[locale] ?? DEFAULT_TITLES.tr)
  const subheading = pickLocalized(config.subheading, locale, '')
  const viewAllLabel = pickLocalized(
    config.viewAllLabel,
    locale,
    DEFAULT_VIEW_ALL[locale] ?? DEFAULT_VIEW_ALL.tr,
  )
  const accent = config.accentClass ?? ''

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
        {campaigns.map((c) => (
          <CampaignCard key={c.id} c={c} locale={locale} accent={accent} />
        ))}
      </div>
    </section>
  )
}
