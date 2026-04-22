import { TAuthor } from '@/data/authors'
import Avatar from '@/shared/Avatar'
import { Badge } from '@/shared/Badge'
import { StarIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import Link from 'next/link'
import { FC } from 'react'

interface CardAuthorBoxProps {
  className?: string
  author: TAuthor
  index?: number
}

const RANK_COLORS: Record<number, 'red' | 'blue' | 'green'> = {
  1: 'red',
  2: 'blue',
  3: 'green',
}

const CardAuthorBox: FC<CardAuthorBoxProps> = ({ className = '', author, index }) => {
  const { displayName, handle = '/', avatarUrl, starRating, jobName, count, category } = author

  return (
    <Link
      href={`/authors/${handle}`}
      className={`relative flex flex-col items-center justify-center nc-box-has-hover px-3 py-5 text-center sm:px-6 sm:py-7 ${className}`}
    >
      {index && RANK_COLORS[index] && (
        <Badge className="absolute top-3 left-3" color={RANK_COLORS[index]}>
          #{index}
        </Badge>
      )}

      {/* Category badge */}
      {category && (
        <span className="absolute top-3 right-3 rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-medium text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
          {category}
        </span>
      )}

      <Avatar className="size-20" src={avatarUrl} />

      <div className="mt-3">
        <h2 className="text-base font-medium">
          <span className="line-clamp-1">{displayName}</span>
        </h2>
        <span className="mt-1 block text-sm text-neutral-500 dark:text-neutral-400">{jobName}</span>
      </div>

      {/* Rating + listing count */}
      <div className="mt-4 flex items-center gap-2">
        <div className="flex items-center gap-1 rounded-full bg-neutral-100 px-3 py-1.5 dark:bg-neutral-800">
          <span className="text-xs font-semibold">{starRating ?? 4.9}</span>
          <HugeiconsIcon icon={StarIcon} className="size-3.5 text-amber-500" strokeWidth={1.75} />
        </div>
        {count !== undefined && (
          <div className="rounded-full border border-neutral-200 px-3 py-1.5 dark:border-neutral-700">
            <span className="text-xs text-neutral-500 dark:text-neutral-400">{count} ilan</span>
          </div>
        )}
      </div>
    </Link>
  )
}

export default CardAuthorBox
