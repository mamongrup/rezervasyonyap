'use client'

import clsx from 'clsx'
import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'
import listingPlaceholder from '@/images/hero-right.png'

const FALLBACK_LISTING_IMG =
  typeof listingPlaceholder === 'string' ? listingPlaceholder : listingPlaceholder.src

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
  const urlStrings = galleryToUrlStrings(galleryImgs ?? [])
  const images = urlStrings.length > 0 ? urlStrings : [FALLBACK_LISTING_IMG]

  function changePhotoId(newVal: number) {
    setIndex(newVal)
  }

  const currentSrc = images[index] ?? images[0]

  return (
    <div className={clsx(`group/cardGallerySlider group relative`, className)}>
      {/* Main image */}
      <div className={clsx(`w-full overflow-hidden rounded-xl`, galleryClass)}>
        <Link href={href} className={clsx(`relative flex items-center justify-center`, ratioClass)}>
          <div className="absolute inset-0">
            <Image
              src={currentSrc}
              fill
              alt="listing card gallery"
              className={clsx(`rounded-xl object-cover`, imageClass)}
              sizes="(max-width: 640px) 92vw, (max-width: 1024px) 46vw, (max-width: 1280px) 31vw, 24vw"
              unoptimized={currentSrc.startsWith('data:') || /^https?:\/\//i.test(currentSrc)}
            />
          </div>
        </Link>
      </div>

      {/* Buttons + bottom nav bar */}
      <>
        {/* DOM/TBT optimizasyonu: kartlarda yüzlerce tekrar eden ok butonunu kaldırıyoruz.
            Kaydırma noktaları (dot) ile gezinme korunur, ilk yükte node sayısı düşer. */}

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
                className={`h-1.5 w-1.5 rounded-full ${i === index ? 'bg-white' : 'bg-white/60'}`}
                onClick={() => changePhotoId(i)}
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
