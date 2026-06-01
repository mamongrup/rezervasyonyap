import { getTourHubCategories, tourHubCategoryTitle, type TourHubCategory } from '@/data/tour-hub-categories'
import { vitrinHref } from '@/lib/vitrin-href'
import Link from 'next/link'
import { ArrowRight01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'

async function resolveCategoryLinks(locale: string, categories: TourHubCategory[]) {
  return Promise.all(
    categories.map(async (cat) => ({
      ...cat,
      href: await vitrinHref(locale, cat.path),
      links: await Promise.all(
        cat.links.map(async (link) => ({
          ...link,
          href: await vitrinHref(locale, link.path),
        })),
      ),
    })),
  )
}

export default async function TourHubCategoryGrid({ locale = 'tr' }: { locale?: string }) {
  const categories = getTourHubCategories(locale)
  const resolved = await resolveCategoryLinks(locale, categories)
  const isEn = locale === 'en' || locale.startsWith('en-')

  return (
    <section className="container mt-8 lg:mt-12" aria-labelledby="tour-hub-heading">
      <div className="mb-8 max-w-3xl">
        <h2 id="tour-hub-heading" className="text-2xl font-semibold text-neutral-900 md:text-3xl dark:text-white">
          {isEn ? 'International & domestic tours' : 'Yurt içi ve yurt dışı turlar'}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-neutral-600 md:text-base dark:text-neutral-400">
          {isEn
            ? 'Browse tours by region, departure city, duration and travel style — pick a category to see matching programs.'
            : 'Bölge, kalkış noktası, süre ve ulaşım tipine göre tur seçeneklerini keşfedin; kategoriye tıklayarak ilgili programları listeleyin.'}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {resolved.map((cat) => (
          <article
            key={cat.id}
            className="group relative min-h-[280px] overflow-hidden rounded-2xl bg-neutral-900 shadow-md transition-shadow hover:shadow-xl sm:min-h-[300px]"
          >
            <Link href={cat.href} className="absolute inset-0 z-[1]" aria-label={tourHubCategoryTitle(cat, locale)}>
              <span className="sr-only">{tourHubCategoryTitle(cat, locale)}</span>
            </Link>

            <div
              className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
              style={{ backgroundImage: `url(${cat.image})` }}
              role="img"
              aria-hidden
            />
            <div
              className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/45 to-black/20"
              aria-hidden
            />

            <div className="relative z-[2] flex h-full min-h-[280px] flex-col p-5 sm:min-h-[300px] sm:p-6">
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-lg font-bold uppercase tracking-wide text-white sm:text-xl">
                  {tourHubCategoryTitle(cat, locale)}
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
