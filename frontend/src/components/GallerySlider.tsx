'use client'

import clsx from 'clsx'
import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'
import { ArrowLeft02Icon, ArrowRight02Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
interface GallerySliderProps {
  className?: string
  uniqueID?: string
  galleryImgs: (
    | {
        src: string
        width: number
        height: number
      }
    | string
  )[]
  ratioClass?: string
  href?: string
  imageClass?: string
  galleryClass?: string
  /** Alt gradient şeridi — varsayılan `rounded-b-xl`; asimetrik köşeli görsellerde `asymmetric-image-bottom-fade` */
  bottomOverlayClassName?: string
  navigation?: boolean
}

function galleryToUrlStrings(galleryImgs: GallerySliderProps['galleryImgs']): string[] {
  const out: string[] = []
  for (const item of galleryImgs) {
    const s = typeof item === 'string' ? item : item?.src
    if (typeof s === 'string' && s.trim() !== '') out.push(s.trim())
  }
  return out
}

export default function GallerySlider({
  className,
  uniqueID,
  galleryImgs,
  ratioClass = 'aspect-w-4 aspect-h-3',
  imageClass,
  galleryClass,
  bottomOverlayClassName,
  href = '/otel/the-handle',
  navigation = true,
}: GallerySliderProps) {
  const [index, setIndex] = useState(0)
  const images = galleryToUrlStrings(galleryImgs ?? []).filter((u) => u.trim() !== '')

  const currentSrc = images.length > 0 ? (images[index] ?? images[0]) : ''

  return (
    <div className={clsx(`group/cardGallerySlider group relative`, className)}>
      {/* Main image */}
      <div className={clsx(`relative w-full overflow-hidden rounded-xl`, galleryClass)}>
        <Link href={href} className={clsx(`relative flex items-center justify-center`, ratioClass)}>
          <div className="absolute inset-0">
            {currentSrc ? (
              <Image
                src={currentSrc}
                fill
                alt="listing card gallery"
                className={clsx(`rounded-xl object-cover`, imageClass)}
                sizes="(max-width: 640px) 92vw, (max-width: 1024px) 46vw, (max-width: 1280px) 31vw, 24vw"
                unoptimized={
                  currentSrc.startsWith('data:') ||
                  currentSrc.startsWith('/uploads/') ||
                  /^https?:\/\//i.test(currentSrc)
                }
              />
            ) : (
              <div className="absolute inset-0 rounded-xl bg-neutral-200 dark:bg-neutral-700" aria-hidden />
            )}
          </div>
        </Link>
        {navigation && images.length > 1 && (
          <>
            <button
              type="button"
              className="absolute start-2 top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-neutral-900 opacity-100 shadow-md transition-opacity hover:bg-white sm:opacity-0 sm:hover:bg-white sm:group-hover/cardGallerySlider:opacity-100 dark:bg-neutral-900/90 dark:text-white dark:hover:bg-neutral-900 rtl:flex-row-reverse"
              aria-label="Previous photo"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                if (images.length < 2) return
                setIndex((i) => (i - 1 + images.length) % images.length)
              }}
            >
              <HugeiconsIcon icon={ArrowLeft02Icon} size={18} strokeWidth={2} />
            </button>
            <button
              type="button"
              className="absolute end-2 top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-neutral-900 opacity-100 shadow-md transition-opacity hover:bg-white sm:opacity-0 sm:hover:bg-white sm:group-hover/cardGallerySlider:opacity-100 dark:bg-neutral-900/90 dark:text-white dark:hover:bg-neutral-900 rtl:flex-row-reverse"
              aria-label="Next photo"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                if (images.length < 2) return
                setIndex((i) => (i + 1) % images.length)
              }}
            >
              <HugeiconsIcon icon={ArrowRight02Icon} size={18} strokeWidth={2} />
            </button>
          </>
        )}
      </div>

      {/* Buttons + bottom nav bar */}
      <>
        {/* Bottom Nav bar */}
        <div
          className={clsx(
            'absolute inset-x-0 bottom-0 h-10 bg-linear-to-t from-neutral-900 opacity-50',
            bottomOverlayClassName,
          )}
        ></div>
        {navigation && images.length > 1 && (
          <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 items-center justify-center gap-x-1.5">
            {images.map((_, i) => (
              <button
                type="button"
                className={`h-1.5 w-1.5 rounded-full ${i === index ? 'bg-white' : 'bg-white/60'}`}
                onClick={() => setIndex(i)}
                key={uniqueID ? `${uniqueID}-dot-${i}` : i}
                aria-label={`Go to image ${i + 1}`}
              />
            ))}
          </div>
        )}
      </>
    </div>
  )
}
