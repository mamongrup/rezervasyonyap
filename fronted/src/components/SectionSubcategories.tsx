import Link from 'next/link'
import {
  getSubcategoriesByParent,
  subcategoryColorClasses,
  subcategoryDescriptionForLocale,
  subcategoryLabelForLocale,
} from '@/data/subcategory-registry'
import type { SubcategoryEntry } from '@/data/subcategory-registry'
import { SubcategoryIcon } from '@/lib/subcategory-icons'

interface Props {
  parentCategorySlug: string
  locale?: string
  /**
   * Dışarıdan geçilebilir (ör. admin override veya backend'den çekilen liste).
   * Boşsa statik registry kullanılır.
   */
  subcategories?: SubcategoryEntry[]
  /** Başlık göster/gizle */
  showHeading?: boolean
  /** Kart stili: "pill" = yuvarlak hap | "card" = büyük kart | "icon-grid" = ikon grid */
  variant?: 'pill' | 'card' | 'icon-grid'
  /** Ana kategori route prefix (/oteller, /turlar vb.) */
  categoryRoute?: string
}

export default function SectionSubcategories({
  parentCategorySlug,
  locale = 'tr',
  subcategories,
  showHeading = true,
  variant = 'icon-grid',
  categoryRoute,
}: Props) {
  const items = subcategories ?? getSubcategoriesByParent(parentCategorySlug)

  if (items.length === 0) return null

  if (variant === 'pill') return <PillVariant items={items} locale={locale} categoryRoute={categoryRoute} />
  if (variant === 'card') return <CardVariant items={items} locale={locale} showHeading={showHeading} categoryRoute={categoryRoute} />
  return <IconGridVariant items={items} locale={locale} showHeading={showHeading} categoryRoute={categoryRoute} />
}

// ── Pill ────────────────────────────────────────────────────────────────────

function PillVariant({ items, locale, categoryRoute }: { items: SubcategoryEntry[]; locale: string; categoryRoute?: string }) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((sub) => {
        const href = sub.href ?? `${categoryRoute ?? ''}/${sub.slug}`
        return (
          <Link
            key={sub.id}
            href={href}
            className="flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-sm font-medium text-neutral-700 transition-all hover:border-primary-400 hover:bg-primary-50 hover:text-primary-700 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:border-primary-600 dark:hover:bg-primary-900/20"
          >
            <SubcategoryIcon entry={sub} className="h-4 w-4" />
            <span>{subcategoryLabelForLocale(sub, locale)}</span>
          </Link>
        )
      })}
    </div>
  )
}

// ── Card ─────────────────────────────────────────────────────────────────────

function CardVariant({ items, locale, showHeading, categoryRoute }: { items: SubcategoryEntry[]; locale: string; showHeading: boolean; categoryRoute?: string }) {
  return (
    <div>
      {showHeading && (
        <div className="mb-6">
          <h2 className="text-xl font-bold text-neutral-900 dark:text-white">
            {locale === 'en' ? 'Browse by Type' : 'Türe Göre Gözat'}
          </h2>
        </div>
      )}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {items.map((sub) => {
          const c = subcategoryColorClasses(sub.color)
          const href = sub.href ?? `${categoryRoute ?? ''}/${sub.slug}`
          return (
            <Link
              key={sub.id}
              href={href}
              className={[
                'group flex flex-col items-center gap-2.5 rounded-2xl border p-4 text-center transition-all duration-200',
                'hover:-translate-y-0.5 hover:shadow-md',
                c.border,
                c.bg,
              ].join(' ')}
            >
              <span
                className={[
                  'flex h-12 w-12 items-center justify-center rounded-xl transition-transform group-hover:scale-110',
                  c.iconBg,
                ].join(' ')}
              >
                <SubcategoryIcon entry={sub} className="h-6 w-6" />
              </span>
              <div>
                <p className={['text-sm font-semibold', c.text].join(' ')}>
                  {subcategoryLabelForLocale(sub, locale)}
                </p>
                <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400 line-clamp-1">
                  {subcategoryDescriptionForLocale(sub, locale)}
                </p>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}

// ── Icon Grid (default) ──────────────────────────────────────────────────────

function IconGridVariant({ items, locale, showHeading, categoryRoute }: { items: SubcategoryEntry[]; locale: string; showHeading: boolean; categoryRoute?: string }) {
  return (
    <div>
      {showHeading && (
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-bold text-neutral-900 dark:text-white">
            {locale === 'en' ? 'Browse by Type' : 'Türe Göre Gözat'}
          </h2>
        </div>
      )}

      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7">
        {items.map((sub) => {
          const c = subcategoryColorClasses(sub.color)
          const href = sub.href ?? `${categoryRoute ?? ''}/${sub.slug}`
          return (
            <Link
              key={sub.id}
              href={href}
              className="group flex flex-col items-center gap-2 rounded-2xl p-3 text-center transition-all duration-200 hover:bg-neutral-50 dark:hover:bg-neutral-800/60"
            >
              {/* Ikon dairesi */}
              <span
                className={[
                  'flex h-14 w-14 items-center justify-center rounded-2xl border shadow-sm transition-all duration-200 group-hover:scale-110 group-hover:shadow-md',
                  c.iconBg,
                  c.border,
                ].join(' ')}
              >
                <SubcategoryIcon entry={sub} className="h-7 w-7" />
              </span>

              {/* Yazı */}
              <p className="text-xs font-medium leading-tight text-neutral-700 group-hover:text-primary-600 dark:text-neutral-300 dark:group-hover:text-primary-400 line-clamp-2">
                {subcategoryLabelForLocale(sub, locale)}
              </p>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
