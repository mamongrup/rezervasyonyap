import { storageKeyToPublicUrl } from '@/lib/listing-gallery-hero-order'
import type { HotelListingPromotion } from '@/lib/travel-api'
import Image from 'next/image'
import Link from 'next/link'

export type HotelPromotionGroup = {
  label: string
  promotions: HotelListingPromotion[]
}

function promotionImageSrc(raw: string): string | null {
  const t = raw.trim()
  if (!t) return null
  if (/^https?:\/\//i.test(t)) return t
  if (t.startsWith('/')) return t
  return storageKeyToPublicUrl(t)
}

function promotionTitle(item: HotelListingPromotion, locale: string): string {
  const lang = locale.split('-')[0] ?? 'tr'
  if (lang !== 'tr' && item.title_en.trim()) return item.title_en.trim()
  return item.title.trim()
}

function PromotionCards({ locale, promotions }: { locale: string; promotions: HotelListingPromotion[] }) {
  return (
    <ul className="flex gap-3 overflow-x-auto pb-1 snap-x snap-mandatory [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {promotions.map((item) => {
        const label = promotionTitle(item, locale)
        const imgSrc = promotionImageSrc(item.image_url)
        const href = item.link_url.trim() || null
        const card = (
          <div className="flex h-full min-h-[4.5rem] min-w-[11rem] max-w-[18rem] flex-1 items-center gap-3 rounded-xl border border-violet-200/90 bg-white px-4 py-3 shadow-sm transition hover:border-violet-300 hover:shadow-md dark:border-violet-800/60 dark:bg-neutral-900 dark:hover:border-violet-700 sm:min-w-[13rem]">
            {imgSrc ? (
              <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-md bg-neutral-50 dark:bg-neutral-800">
                <Image
                  src={imgSrc}
                  alt=""
                  fill
                  sizes="36px"
                  className="object-contain p-0.5"
                  unoptimized={imgSrc.startsWith('http')}
                />
              </div>
            ) : (
              <div
                aria-hidden
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-violet-50 text-violet-600 dark:bg-violet-950/50 dark:text-violet-300"
              >
                <span className="text-lg font-bold">★</span>
              </div>
            )}
            <p className="min-w-0 text-sm font-semibold leading-snug text-neutral-800 dark:text-neutral-100">
              {label}
            </p>
          </div>
        )

        return (
          <li key={item.id} className="shrink-0">
            {href ? (
              <Link
                href={href}
                target={href.startsWith('http') ? '_blank' : undefined}
                rel={href.startsWith('http') ? 'noopener noreferrer' : undefined}
                className="block transition hover:opacity-90"
              >
                {card}
              </Link>
            ) : (
              card
            )}
          </li>
        )
      })}
    </ul>
  )
}

export default function HotelListingPromotionsSection({
  locale,
  title,
  groups,
}: {
  locale: string
  title: string
  groups: HotelPromotionGroup[]
}) {
  const visibleGroups = groups.filter((group) => group.promotions.length > 0)
  if (!visibleGroups.length) return null

  const showGroupLabels = visibleGroups.length > 1

  return (
    <section aria-labelledby="hotel-listing-promotions-heading" className="listingSection__wrap">
      <h2
        id="hotel-listing-promotions-heading"
        className="text-lg font-bold text-neutral-900 dark:text-white md:text-xl"
      >
        {title}
      </h2>
      <div className="mt-3 space-y-4">
        {visibleGroups.map((group) => (
          <div key={group.label}>
            {showGroupLabels ? (
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                {group.label}
              </p>
            ) : null}
            <PromotionCards locale={locale} promotions={group.promotions} />
          </div>
        ))}
      </div>
    </section>
  )
}
