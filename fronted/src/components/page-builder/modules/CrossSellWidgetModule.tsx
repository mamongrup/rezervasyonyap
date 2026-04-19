import Link from 'next/link'

import { fetchPublicCrossSellSuggestions, type CrossSellRule } from '@/lib/travel-api'
import { pickLocalized, type LocalizedText } from '@/lib/localized-text'

export interface CrossSellWidgetConfig {
  title?: LocalizedText | string
  subheading?: LocalizedText | string
  /** Tetikleyen kategori kodu (otel, ucak, tur vb.) */
  triggerCategory: string
  /** Maks. öneri sayısı */
  limit?: number
}

const DEFAULT_TITLE: Record<string, string> = {
  tr: 'Birlikte Sıkça Tercih Edilenler',
  en: 'Often Booked Together',
  de: 'Häufig zusammen gebucht',
  ru: 'Часто бронируют вместе',
  zh: '常一起预订',
  fr: 'Souvent réservés ensemble',
}

const CATEGORY_HREF: Record<string, string> = {
  otel: '/tr/otel',
  ucak: '/tr/ucak',
  tur: '/tr/tur',
  arac: '/tr/arac',
  transfer: '/tr/transfer',
  villa: '/tr/villa',
}

const CATEGORY_LABEL: Record<string, Record<string, string>> = {
  tr: { otel: 'Otel', ucak: 'Uçak', tur: 'Tur', arac: 'Araç', transfer: 'Transfer', villa: 'Villa' },
  en: { otel: 'Hotel', ucak: 'Flight', tur: 'Tour', arac: 'Car rental', transfer: 'Transfer', villa: 'Villa' },
  de: { otel: 'Hotel', ucak: 'Flug', tur: 'Tour', arac: 'Mietwagen', transfer: 'Transfer', villa: 'Villa' },
  ru: { otel: 'Отель', ucak: 'Авиабилет', tur: 'Тур', arac: 'Аренда авто', transfer: 'Трансфер', villa: 'Вилла' },
  zh: { otel: '酒店', ucak: '机票', tur: '旅游', arac: '租车', transfer: '接送', villa: '别墅' },
  fr: { otel: 'Hôtel', ucak: 'Vol', tur: 'Circuit', arac: 'Location', transfer: 'Transfert', villa: 'Villa' },
}

function categoryLabel(code: string, locale: string): string {
  return CATEGORY_LABEL[locale]?.[code] ?? CATEGORY_LABEL.tr[code] ?? code
}

async function safeRules(triggerCategory: string): Promise<CrossSellRule[]> {
  try {
    const { rules } = await fetchPublicCrossSellSuggestions(triggerCategory)
    return rules ?? []
  } catch {
    return []
  }
}

export default async function CrossSellWidgetModule({
  config,
  locale = 'tr',
}: {
  config: CrossSellWidgetConfig
  locale?: string
}) {
  if (!config.triggerCategory) return null
  const rules = (await safeRules(config.triggerCategory)).slice(0, config.limit ?? 4)
  if (!rules.length) return null

  const title = pickLocalized(config.title, locale, DEFAULT_TITLE[locale] ?? DEFAULT_TITLE.tr)
  const subheading = pickLocalized(config.subheading, locale, '')

  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-neutral-200 bg-neutral-50 p-6 dark:border-neutral-800 dark:bg-neutral-900">
      <header>
        <h2 className="text-xl font-bold text-neutral-900 dark:text-white">{title}</h2>
        {subheading && <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">{subheading}</p>}
      </header>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {rules.map((r) => {
          const offerHref = CATEGORY_HREF[r.offer_category_code] ?? `/tr/${r.offer_category_code}`
          const label = categoryLabel(r.offer_category_code, locale)
          const dp = r.discount_percent
          return (
            <Link
              key={r.id}
              href={offerHref}
              className="flex flex-col items-center justify-center gap-1 rounded-xl bg-white p-4 text-center shadow-sm transition hover:shadow-md dark:bg-neutral-800"
            >
              <span className="text-sm font-semibold text-neutral-900 dark:text-white">{label}</span>
              {dp ? (
                <span className="text-xs font-bold text-rose-600 dark:text-rose-300">
                  {locale === 'en' ? `Save ${dp}%` : `%${dp} indirim`}
                </span>
              ) : (
                <span className="text-xs text-neutral-500">→</span>
              )}
            </Link>
          )
        })}
      </div>
    </section>
  )
}
