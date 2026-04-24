import { TCategory } from '@/data/categories'
import { toExternalThumb } from '@/lib/image-thumb'
import { Link } from '@/shared/link'
import convertNumbThousand from '@/utils/convertNumbThousand'
import Image from 'next/image'
import { FC } from 'react'

export interface CardCategoryBox1Props {
  className?: string
  category: TCategory
}

const CardCategoryBox1: FC<CardCategoryBox1Props> = ({ className = '', category }) => {
  const { count, name, thumbnail, href } = category
  const regionCount = 'regionCount' in category ? (category as { regionCount?: number }).regionCount : undefined
  const regionLine = regionCount != null ? `${convertNumbThousand(regionCount)} bölge` : ''
  const listingLine = count > 0 ? `${convertNumbThousand(count)}+ ilan` : 'İlan bekleniyor'
  const muted = 'text-sm text-neutral-500 dark:text-neutral-400'
  // 96px daire için — migration script `/uploads/external/<hash>-thumb.avif` (256x256) üretir.
  const thumbSrc = toExternalThumb(thumbnail || '')

  return (
    <Link
      href={href}
      className={`relative flex items-start gap-4 nc-box-has-hover p-3 sm:gap-5 sm:p-6 ${className}`}
    >
      <div className="relative size-24 shrink-0 overflow-hidden rounded-full">
        <Image src={thumbSrc} fill alt="" sizes="96px" />
      </div>

      <div className="min-w-0 flex-1">
        <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
          <span className="line-clamp-2">{name}</span>
        </h2>
        {regionLine && <p className={`mt-1.5 ${muted}`}>{regionLine}</p>}
        <p className={`mt-0.5 ${muted}`}>{listingLine}</p>
      </div>
    </Link>
  )
}

export default CardCategoryBox1
