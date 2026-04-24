import { TCategory } from '@/data/categories'
import { toExternalThumb } from '@/lib/image-thumb'
import Image from 'next/image'
import Link from 'next/link'
import { FC } from 'react'

export interface CardCategory1Props {
  className?: string
  category: TCategory
  size?: 'large' | 'normal'
}

const CardCategory1: FC<CardCategory1Props> = ({ className = '', size = 'normal', category }) => {
  const { count, name, href, thumbnail } = category
  // 48–80px kare render — migration thumb (256x256) varsa onu tercih et.
  const thumbSrc = toExternalThumb(thumbnail || '')
  const imgSizes = size === 'large' ? '80px' : '48px'
  return (
    <Link href={href} className={`flex items-center ${className}`}>
      <div className={`relative shrink-0 ${size === 'large' ? 'size-20' : 'size-12'} me-4 overflow-hidden rounded-lg`}>
        <Image alt={name} fill src={thumbSrc} sizes={imgSizes} className="object-cover" />
      </div>

      <div>
        <h2
          className={`${
            size === 'large' ? 'text-lg' : 'text-base'
          } font-semibold nc-card-title text-neutral-900 dark:text-neutral-100`}
        >
          {name}
        </h2>
        <span
          className={`${size === 'large' ? 'text-sm' : 'text-xs'} mt-0.5 block text-neutral-500 dark:text-neutral-400`}
        >
          {count > 0 ? `${count}+ ilan` : 'İlan bekleniyor'}
        </span>
      </div>
    </Link>
  )
}

export default CardCategory1
