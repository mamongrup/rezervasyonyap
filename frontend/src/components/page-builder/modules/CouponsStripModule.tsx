import { listPublicActiveCoupons, pickCouponDescription, pickCouponName } from '@/lib/travel-api'
import { pickLocalized, type LocalizedText } from '@/lib/localized-text'

import CouponCopyButton from './CouponCopyButton'

export interface CouponsStripConfig {
  title?: LocalizedText | string
  subheading?: LocalizedText | string
  limit?: number
}

const DEFAULT_TITLE: Record<string, string> = {
  tr: 'İndirim Kodları',
  en: 'Discount Codes',
  de: 'Rabattcodes',
  ru: 'Промокоды',
  zh: '优惠码',
  fr: 'Codes de réduction',
}

const COPY: Record<string, { copy: string; copied: string; off: (v: string) => string }> = {
  tr: { copy: 'Kopyala', copied: 'Kopyalandı', off: (v) => `${v} indirim` },
  en: { copy: 'Copy', copied: 'Copied', off: (v) => `${v} off` },
  de: { copy: 'Kopieren', copied: 'Kopiert', off: (v) => `${v} Rabatt` },
  ru: { copy: 'Копировать', copied: 'Скопировано', off: (v) => `Скидка ${v}` },
  zh: { copy: '复制', copied: '已复制', off: (v) => `${v} 优惠` },
  fr: { copy: 'Copier', copied: 'Copié', off: (v) => `${v} de réduction` },
}

function formatDiscount(type: string, value: string): string {
  if (type === 'percent') return `%${value.replace(/\.00$/, '')}`
  return value
}

export default async function CouponsStripModule({
  config,
  locale = 'tr',
}: {
  config: CouponsStripConfig
  locale?: string
}) {
  const limit = Math.min(Math.max(config.limit ?? 6, 1), 50)
  const { coupons } = await listPublicActiveCoupons({ limit })
  if (!coupons.length) return null

  const title = pickLocalized(config.title, locale, DEFAULT_TITLE[locale] ?? DEFAULT_TITLE.tr)
  const subheading = pickLocalized(config.subheading, locale, '')
  const copy = COPY[locale] ?? COPY.tr

  return (
    <section className="flex flex-col gap-5">
      <header>
        <h2 className="text-2xl font-bold text-neutral-900 dark:text-white md:text-3xl">{title}</h2>
        {subheading && <p className="mt-1 text-neutral-600 dark:text-neutral-400">{subheading}</p>}
      </header>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {coupons.map((c) => {
          const name = pickCouponName(c, locale)
          const desc = pickCouponDescription(c, locale)
          const off = formatDiscount(c.discount_type, c.discount_value)
          return (
            <article
              key={c.id}
              className="flex items-center justify-between gap-3 rounded-2xl border-2 border-dashed border-primary-300 bg-primary-50/40 p-4 dark:border-primary-700 dark:bg-primary-950/20"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-neutral-900 dark:text-white">{name}</p>
                {desc && (
                  <p className="mt-0.5 line-clamp-2 text-xs text-neutral-600 dark:text-neutral-400">{desc}</p>
                )}
                <p className="mt-1 text-xs font-bold uppercase tracking-wide text-primary-700 dark:text-primary-300">
                  {copy.off(off)}
                </p>
              </div>
              <CouponCopyButton code={c.code} copyLabel={copy.copy} copiedLabel={copy.copied} />
            </article>
          )
        })}
      </div>
    </section>
  )
}
