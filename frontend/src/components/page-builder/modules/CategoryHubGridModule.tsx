import { getTourHubCategories, type TourHubCategory } from '@/data/tour-hub-categories'
import { vitrinHref } from '@/lib/vitrin-href'
import Link from 'next/link'
import { ArrowRight01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'

export interface CategoryHubGridLink {
  label: string
  /** Vitrin yolu — locale öneki olmadan, örn. /turlar/all?location=paris */
  path: string
}

export interface CategoryHubGridCard {
  id: string
  title: string
  titleEn?: string
  image: string
  path: string
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
    config.cards && config.cards.length > 0
      ? config.cards
      : categorySlug === 'turlar'
        ? getTourHubCategories(locale).map(tourCategoryToHubCard)
        : []

  if (rawCards.length === 0) return null

  const resolved = await resolveCards(locale, rawCards)
  const heading = resolveHeading(config, locale)
  const subheading = resolveSubheading(config, locale)

  return (
    <section className="container mt-8 lg:mt-12" aria-labelledby="category-hub-heading">
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
            <Link href={cat.href} className="absolute inset-0 z-[1]" aria-label={cardTitle(cat, locale)}>
              <span className="sr-only">{cardTitle(cat, locale)}</span>
            </Link>

            <div
              className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
              style={{ backgroundImage: `url(${cat.image})` }}
              role="img"
              aria-hidden
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/45 to-black/20" aria-hidden />

            <div className="relative z-[2] flex h-full min-h-[280px] flex-col p-5 sm:min-h-[300px] sm:p-6">
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-lg font-bold uppercase tracking-wide text-white sm:text-xl">
                  {cardTitle(cat, locale)}
                </h3>
                <HugeiconsIcon
                  icon={ArrowRight01Icon}
                  className="h-5 w-5 shrink-0 text-white/80 transition-transform group-hover:translate-x-0.5"
                  strokeWidth={2}
                />
              </div>
              <div className="mt-3 h-px w-12 bg-white/70" aria-hidden />

              <ul className="mt-auto space-y-1.5 pt-6">
                {cat.links.map((link) => (
                  <li key={`${cat.id}-${link.label}`}>
                    <Link
                      href={link.href}
                      className="relative z-[3] inline-block text-sm text-white/90 transition-colors hover:text-white hover:underline"
                    >
                      {link.label}
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
