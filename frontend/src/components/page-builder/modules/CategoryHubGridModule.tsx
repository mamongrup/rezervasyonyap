import { getTourHubCategories, type TourHubCategory } from '@/data/tour-hub-categories'
import { mergeKruvaziyerHubCards } from '@/data/cruise-hub-categories'
import {
  enrichCruiseBrandHubCards,
  enrichCruiseRouteHubCards,
} from '@/lib/cruise-hub-enrich'
import { getPublicCruiseHubStats } from '@/lib/travel-api'
import { heroBelowContentClassName } from '@/components/hero-sections/hero-below-header-classes'
import { vitrinHref } from '@/lib/vitrin-href'
import Link from 'next/link'
import { ArrowRight01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'

export interface CategoryHubGridLink {
  label: string
  /** Hub kartlarında ikinci satır (ör. gece sayısı) */
  sublabel?: string
  /** Vitrin yolu — locale öneki olmadan, örn. /turlar/all?location=paris */
  path: string
}

export interface CategoryHubGridCard {
  id: string
  /** API filtre kodu (ör. msc, akdeniz-gemi-turlari) — hub istatistik eşleşmesi */
  hubCode?: string
  title: string
  titleEn?: string
  image: string
  path: string
  /** Örn. "38 tur" — kruvaziyer hub kartlarında dinamik */
  metaLine?: string
  links: CategoryHubGridLink[]
}

export interface CategoryHubGridModuleConfig {
  heading?: string
  headingEn?: string
  subheading?: string
  subheadingEn?: string
  cards?: CategoryHubGridCard[]
}

type ResolvedCategoryHubGridLink = CategoryHubGridLink & { href: string }

type ResolvedCategoryHubGridCard = Omit<CategoryHubGridCard, 'links'> & {
  href: string
  links: ResolvedCategoryHubGridLink[]
}

function isEnLocale(locale: string) {
  return locale === 'en' || locale.startsWith('en-')
}

function cardTitle(card: CategoryHubGridCard, locale: string) {
  return isEnLocale(locale) && card.titleEn?.trim() ? card.titleEn : card.title
}

async function resolveCards(locale: string, cards: CategoryHubGridCard[]): Promise<ResolvedCategoryHubGridCard[]> {
  return Promise.all(
    cards.map(async (cat): Promise<ResolvedCategoryHubGridCard> => ({
      ...cat,
      href: await vitrinHref(locale, cat.path),
      links: await Promise.all(
        cat.links.map(async (link): Promise<ResolvedCategoryHubGridLink> => ({
          ...link,
          href: await vitrinHref(locale, link.path),
        })),
      ),
    })),
  )
}

function tourCategoryToHubCard(cat: TourHubCategory): CategoryHubGridCard {
  return {
    id: cat.id,
    title: cat.title,
    titleEn: cat.titleEn,
    image: cat.image,
    path: cat.path,
    links: cat.links.map((l) => ({ label: l.label, path: l.path })),
  }
}

function defaultHeading(locale: string) {
  return isEnLocale(locale) ? 'International & domestic tours' : 'Yurt içi ve yurt dışı turlar'
}

function defaultSubheading(locale: string) {
  return isEnLocale(locale)
    ? 'Browse tours by region, departure city, duration and travel style — pick a category to see matching programs.'
    : 'Bölge, kalkış noktası, süre ve ulaşım tipine göre tur seçeneklerini keşfedin; kategoriye tıklayarak ilgili programları listeleyin.'
}

function resolveHeading(config: CategoryHubGridModuleConfig, locale: string) {
  if (isEnLocale(locale) && config.headingEn?.trim()) return config.headingEn
  if (config.heading?.trim()) return config.heading
  return defaultHeading(locale)
}

function resolveSubheading(config: CategoryHubGridModuleConfig, locale: string) {
  if (isEnLocale(locale) && config.subheadingEn?.trim()) return config.subheadingEn
  if (config.subheading?.trim()) return config.subheading
  return defaultSubheading(locale)
}

export default async function CategoryHubGridModule({
  config,
  locale = 'tr',
  categorySlug,
}: {
  config: CategoryHubGridModuleConfig
  locale?: string
  /** Kart listesi boşsa yalnızca `turlar` için kod varsayılanları kullanılır */
  categorySlug?: string
}) {
  const rawCards =
    categorySlug === 'kruvaziyer'
      ? mergeKruvaziyerHubCards(config, locale)
      : config.cards && config.cards.length > 0
        ? config.cards
        : categorySlug === 'turlar'
          ? getTourHubCategories(locale).map(tourCategoryToHubCard)
          : []

  if (rawCards.length === 0) return null

  let cardsToResolve = rawCards
  if (categorySlug === 'kruvaziyer') {
    const heading = `${config.heading || ''} ${config.headingEn || ''}`.toLowerCase()
    const isRoute = heading.includes('rota') || heading.includes('route')
    const stats = await getPublicCruiseHubStats({ next: { revalidate: 300 } })
    cardsToResolve = isRoute
      ? enrichCruiseRouteHubCards(rawCards, stats, locale)
      : enrichCruiseBrandHubCards(rawCards, stats, locale)
  }

  const resolved = await resolveCards(locale, cardsToResolve)
  const heading = resolveHeading(config, locale)
  const subheading = resolveSubheading(config, locale)

  return (
    <section className={`${heroBelowContentClassName} container mt-4 lg:mt-6`} aria-labelledby="category-hub-heading">
      {(heading || subheading) && (
        <div className="mb-8 max-w-3xl">
          {heading ? (
            <h2 id="category-hub-heading" className="text-2xl font-semibold text-neutral-900 md:text-3xl dark:text-white">
              {heading}
            </h2>
          ) : null}
          {subheading ? (
            <p className="mt-2 text-sm leading-relaxed text-neutral-600 md:text-base dark:text-neutral-400">
              {subheading}
            </p>
          ) : null}
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {resolved.map((cat) => (
          <article
            key={cat.id}
            className="group relative min-h-[280px] overflow-hidden rounded-2xl bg-neutral-900 shadow-md transition-shadow hover:shadow-xl sm:min-h-[300px]"
          >
            <Link
              href={cat.href}
              className="absolute inset-0 z-[3] rounded-2xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              aria-label={cardTitle(cat, locale)}
            >
              <span className="sr-only">{cardTitle(cat, locale)}</span>
            </Link>

            <div
              className="absolute inset-0 bg-neutral-900 transition-transform duration-500 group-hover:scale-105"
              aria-hidden
            >
              {cat.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={cat.image}
                  alt=""
                  className="h-full w-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : null}
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/45 to-black/20" aria-hidden />

            <div className="pointer-events-none relative z-[2] flex h-full min-h-[280px] flex-col p-5 sm:min-h-[300px] sm:p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-bold uppercase tracking-wide text-white sm:text-xl">
                    {cardTitle(cat, locale)}
                  </h3>
                  {cat.metaLine ? (
                    <p className="mt-1 text-sm font-medium text-white/80">{cat.metaLine}</p>
                  ) : null}
                </div>
                <HugeiconsIcon
                  icon={ArrowRight01Icon}
                  className="h-5 w-5 shrink-0 text-white/80 transition-transform group-hover:translate-x-0.5"
                  strokeWidth={2}
                />
              </div>
              <div className="mt-3 h-px w-12 bg-white/70" aria-hidden />

              <ul className="mt-auto space-y-1.5 pt-4">
                {cat.links.map((link) => (
                  <li key={`${cat.id}-${link.label}-${link.sublabel ?? ''}`}>
                    <Link
                      href={link.href}
                      className="pointer-events-auto relative z-[4] flex w-full items-baseline justify-between gap-3 text-sm font-medium text-white/90 transition-colors hover:text-white hover:underline"
                    >
                      <span className="min-w-0 truncate leading-snug">{link.label}</span>
                      {link.sublabel ? (
                        <span className="shrink-0 text-xs font-normal text-white/75">{link.sublabel}</span>
                      ) : null}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
