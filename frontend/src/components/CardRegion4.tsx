import convertNumbThousand from '@/utils/convertNumbThousand'
import Image from 'next/image'
import Link from 'next/link'
import { FC } from 'react'
import type { RegionSliderItem } from '@/components/SectionSliderRegions'

export interface CardRegionBaseProps {
  className?: string
  region: RegionSliderItem
  href: string
  unit: string
  isThumbBroken?: boolean
  onThumbError?: () => void
}

const CardRegion4: FC<CardRegionBaseProps> = ({
  className = '',
  region,
  href,
  unit,
  isThumbBroken,
  onThumbError,
}) => {
  return (
    <Link href={href} className={`group flex flex-col ${className}`} aria-label={region.name}>
      <div className="relative aspect-square w-full overflow-hidden rounded-2xl">
        {region.thumbnail && !isThumbBroken ? (
          <Image
            src={region.thumbnail}
            alt={region.name}
            fill
            className="rounded-2xl object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 400px) 100vw, 400px"
            onError={onThumbError}
            unoptimized
          />
        ) : (
          <div className="h-full w-full bg-neutral-200 dark:bg-neutral-700" aria-hidden />
        )}
        <span className="absolute inset-0 rounded-2xl bg-black/10 opacity-0 transition-opacity group-hover:opacity-100" />
      </div>
      <div className="mt-4 truncate px-2 text-center">
        <h2 className="truncate text-base font-medium text-neutral-900 lg:text-lg dark:text-neutral-100">
          {region.name}
        </h2>
        {region.count > 0 && (
          <span className="mt-2 block text-sm text-neutral-600 dark:text-neutral-400">
            {convertNumbThousand(region.count)}+ {unit}
          </span>
        )}
      </div>
    </Link>
  )
}

export default CardRegion4

