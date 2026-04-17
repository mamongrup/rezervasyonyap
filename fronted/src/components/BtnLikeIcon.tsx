'use client'

import { useFavorites } from '@/context/FavoritesContext'
import { FavouriteIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import clsx from 'clsx'
import { FC } from 'react'

interface BtnLikeIconProps {
  className?: string
  colorClass?: string
  sizeClass?: string
  /** When provided, the button is wired to the global favorites context. */
  listingId?: string
  /** Fallback: used only when listingId is not given (legacy uncontrolled mode). */
  isLiked?: boolean
}

const BtnLikeIcon: FC<BtnLikeIconProps> = ({
  className,
  colorClass = 'text-white bg-black/30 hover:bg-black/50',
  sizeClass = 'w-8 h-8',
  listingId,
  isLiked = false,
}) => {
  const { isFavorited, toggle } = useFavorites()

  const liked = listingId ? isFavorited(listingId) : isLiked

  function handleClick(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (listingId) toggle(listingId)
  }

  return (
    <div
      className={clsx(
        'flex cursor-pointer items-center justify-center rounded-full transition-colors',
        className,
        colorClass,
        sizeClass,
        liked && 'text-red-500',
      )}
      onClick={handleClick}
    >
      {liked ? (
        <HugeiconsIcon icon={FavouriteIcon} className="size-5" strokeWidth={2} />
      ) : (
        <HugeiconsIcon icon={FavouriteIcon} className="size-5" strokeWidth={1.75} />
      )}
    </div>
  )
}

export default BtnLikeIcon
