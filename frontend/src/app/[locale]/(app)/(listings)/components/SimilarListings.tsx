'use client'

import Image from 'next/image'
import Link from 'next/link'
import { MapPinIcon, StarIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import clsx from 'clsx'

interface SimilarListing {
  id: string
  title: string
  handle: string
  address: string
  price: string
  reviewStart: number
  reviewCount: number
  featuredImage: string
  listingCategory: string
  linkBase: string
  /** Tatil evi: misafir · oda · banyo (StayCard2 ile aynı `capacitySpec`) */
  capacityLine?: string | null
}

interface Props {
  listings: SimilarListing[]
  title?: string
  /** Örn. `/ gece` — vitrin dili */
  perNightSuffix?: string
  /** Varsayılan `listingSection__wrap` */
  sectionClassName?: string
}

const SimilarListings = ({
  listings,
  title = 'Similar listings',
  perNightSuffix = '/ night',
  sectionClassName = 'listingSection__wrap',
}: Props) => {
  if (!listings.length) return null

  return (
    <div className={clsx(sectionClassName, 'min-w-0')}>
      <h2 className="text-2xl font-semibold">{title}</h2>

      <div className="mt-4 grid gap-x-6 gap-y-8 sm:grid-cols-2 md:gap-x-8 md:gap-y-12 lg:grid-cols-3">
        {listings.map((item) => (
          <div key={item.id}>
            <Link href={`${item.linkBase}/${item.handle}`} className="group block">
              <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl">
                <Image
                  src={item.featuredImage}
                  alt={item.title}
                  fill
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                  sizes="(max-width: 640px) 92vw, (max-width: 1024px) 46vw, 33vw"
                />
              </div>
              <div className="mt-3 space-y-1 px-1">
                <p className="text-xs font-medium uppercase tracking-wide text-primary-500">
                  {item.listingCategory}
                </p>
                <h3 className="line-clamp-1 font-semibold text-neutral-900 transition-colors group-hover:text-primary-600 dark:text-white">
                  {item.title}
                </h3>
                <div className="flex items-center gap-1 text-sm text-neutral-500 dark:text-neutral-400">
                  <HugeiconsIcon icon={MapPinIcon} className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
                  <span className="line-clamp-1">{item.address}</span>
                </div>
                <div className="flex items-center justify-between gap-2 pt-1">
                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    {item.capacityLine ? (
                      <span className="line-clamp-1 text-sm text-neutral-500 dark:text-neutral-400">
                        {item.capacityLine}
                      </span>
                    ) : null}
                    <div className="flex shrink-0 items-center gap-1">
                      <HugeiconsIcon icon={StarIcon} className="h-4 w-4 text-yellow-400" strokeWidth={1.75} />
                      <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                        {item.reviewStart.toFixed(1)}
                      </span>
                      <span className="text-sm text-neutral-400">({item.reviewCount})</span>
                    </div>
                  </div>
                  <p className="shrink-0 font-semibold text-neutral-900 dark:text-white">
                    <span>{item.price}</span>
                    {perNightSuffix ? (
                      <span className="text-sm font-normal text-neutral-500"> {perNightSuffix}</span>
                    ) : null}
                  </p>
                </div>
              </div>
            </Link>
          </div>
        ))}
      </div>
    </div>
  )
}

export default SimilarListings
