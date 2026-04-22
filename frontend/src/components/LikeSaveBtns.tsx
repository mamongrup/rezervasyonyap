'use client'

import { ListingShareGalleryButton } from '@/components/listing/ListingShareGalleryButton'
import { ButtonCircle } from '@/shared/Button'
import SocialsShare from '@/shared/SocialsShare'
import { Popover, PopoverButton, PopoverPanel } from '@headlessui/react'
import { FavouriteIcon, Share03Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import clsx from 'clsx'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

export const LikeButton = () => {
  const [isLiked, setIsLiked] = useState(false)
  return (
    <ButtonCircle outline onClick={() => setIsLiked(!isLiked)}>
      {isLiked ? (
        <HugeiconsIcon icon={FavouriteIcon} className="size-5! text-red-400" strokeWidth={2} />
      ) : (
        <HugeiconsIcon icon={FavouriteIcon} className="size-5!" strokeWidth={1.75} />
      )}
    </ButtonCircle>
  )
}

export const ShareButton = ({ shareTitle }: { shareTitle?: string }) => {
  const pathname = usePathname()
  const [pageUrl, setPageUrl] = useState('')
  useEffect(() => {
    if (typeof window === 'undefined') return
    setPageUrl(window.location.href)
  }, [pathname])

  return (
    <Popover className="relative">
      <PopoverButton as={ButtonCircle} outline>
        <HugeiconsIcon icon={Share03Icon} size={20} color="currentColor" strokeWidth={1.5} />
      </PopoverButton>
      <PopoverPanel
        anchor={{
          to: 'bottom end',
          gap: 12,
        }}
        className="relative z-10"
      >
        <div className="w-48 rounded-xl border bg-white px-4 py-2.5 dark:bg-neutral-800">
          <SocialsShare url={pageUrl || undefined} title={shareTitle} />
        </div>
      </PopoverPanel>
    </Popover>
  )
}

const LikeSaveBtns = ({
  className,
  galleryShare,
  shareTitle,
}: {
  className?: string
  /** Galeri görsellerinden (en fazla 10) seçerek paylaşım — Web Share API + dosya ekleri */
  galleryShare?: { galleryUrls: string[]; listingTitle: string; locale: string }
  /** Facebook / X / e-posta için başlık (galeri paylaşımı yokken) */
  shareTitle?: string
}) => {
  const hasGallery = galleryShare && galleryShare.galleryUrls.filter(Boolean).length > 0
  return (
    <div className={clsx('flex gap-2', className)}>
      <LikeButton />
      {hasGallery ? (
        <ListingShareGalleryButton
          galleryUrls={galleryShare.galleryUrls}
          listingTitle={galleryShare.listingTitle}
          locale={galleryShare.locale}
        />
      ) : (
        <ShareButton shareTitle={shareTitle} />
      )}
    </div>
  )
}

export default LikeSaveBtns
