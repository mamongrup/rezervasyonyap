'use client'

import { shouldUnoptimizeListingImage } from '@/lib/listing-image-optimization'
import { nextListingImageUrlFallback } from '@/lib/listing-image-url-fallbacks'
import { ArrowLeft02Icon, ArrowRight02Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import clsx from 'clsx'
import Image from 'next/image'
import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'

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
    if (out.length >= 5) break
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
  const [failed, setFailed] = useState<Set<number>>(() => new Set())
  const [srcOverrides, setSrcOverrides] = useState<Record<number, string>>({})
  const [triedByIndex, setTriedByIndex] = useState<Record<number, string[]>>({})
  const images = galleryToUrlStrings(galleryImgs ?? []).filter((u) => u.trim() !== '')
  const imagesKey = images.join('\u001f')

  useEffect(() => {
    setIndex(0)
    setFailed(new Set())
    setSrcOverrides({})
    setTriedByIndex({})
  }, [uniqueID, imagesKey])

  const baseSrc = images.length > 0 ? (images[index] ?? images[0]) : ''
  const currentSrc = srcOverrides[index] ?? baseSrc

  const onImageError = useCallback(
    (i: number) => {
      const base = images[i] ?? ''
      const shown = srcOverrides[i] ?? base
      const prevTried = triedByIndex[i] ?? []
      const tried = new Set<string>([...prevTried, shown, base].filter(Boolean))
      const fallback = nextListingImageUrlFallback(shown || base, tried)
      if (fallback) {
        setTriedByIndex((prev) => ({ ...prev, [i]: [...tried] }))
        setSrcOverrides((prev) => ({ ...prev, [i]: fallback }))
        return
      }

      setFailed((prev) => {
        const next = new Set(prev)
        next.add(i)
        if (images.length > 1) {
          for (let step = 1; step <= images.length; step++) {
            const candidate = (i + step) % images.length
            if (!next.has(candidate)) {
              setIndex(candidate)
              break
            }
          }
        }
        return next
      })
    },
    [images, srcOverrides, triedByIndex]
  )

  return (
    <div className={clsx(`group/cardGallerySlider group relative`, className)}>
      {/* Main image */}
      <div className={clsx(`relative w-full overflow-hidden rounded-xl`, galleryClass)}>
        <Link href={href} className={clsx(`relative flex items-center justify-center`, ratioClass)}>
          <div className="absolute inset-0">
            {currentSrc && !failed.has(index) ? (
              <Image
                src={currentSrc}
                fill
                alt="listing card gallery"
                className={clsx(`rounded-xl object-cover`, imageClass)}
                sizes="(max-width: 640px) 92vw, (max-width: 1024px) 46vw, (max-width: 1280px) 31vw, 24vw"
                loading="lazy"
                decoding="async"
                referrerPolicy="no-referrer"
                unoptimized={shouldUnoptimizeListingImage(currentSrc)}
                onError={() => onImageError(index)}
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
              className="absolute start-1 top-1/2 z-20 flex size-11 touch-manipulation items-center justify-center rounded-full bg-white/90 text-neutral-900 opacity-100 shadow-md transition-[background-color,opacity,transform] select-none active:scale-95 rtl:flex-row-reverse dark:bg-neutral-900/90 dark:text-white dark:hover:bg-neutral-900 [@media(pointer:fine)]:start-2 [@media(pointer:fine)]:size-9 [@media(pointer:fine)]:opacity-0 [@media(pointer:fine)]:group-hover/cardGallerySlider:opacity-100 [@media(pointer:fine)]:hover:bg-white"
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
              className="absolute end-1 top-1/2 z-20 flex size-11 touch-manipulation items-center justify-center rounded-full bg-white/90 text-neutral-900 opacity-100 shadow-md transition-[background-color,opacity,transform] select-none active:scale-95 rtl:flex-row-reverse dark:bg-neutral-900/90 dark:text-white dark:hover:bg-neutral-900 [@media(pointer:fine)]:end-2 [@media(pointer:fine)]:size-9 [@media(pointer:fine)]:opacity-0 [@media(pointer:fine)]:group-hover/cardGallerySlider:opacity-100 [@media(pointer:fine)]:hover:bg-white"
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
            bottomOverlayClassName
          )}
        ></div>
        {navigation && images.length > 1 && (
          <div className="pointer-events-none absolute bottom-2 left-1/2 z-10 flex -translate-x-1/2 items-center justify-center gap-x-1.5">
            {images.map((_, i) => (
              <button
                type="button"
                className={`pointer-events-auto relative size-1.5 touch-manipulation rounded-full before:absolute before:-inset-2.5 before:content-[''] ${i === index ? 'bg-white' : 'bg-white/60'}`}
                onClick={(event) => {
                  event.preventDefault()
                  event.stopPropagation()
                  setIndex(i)
                }}
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
