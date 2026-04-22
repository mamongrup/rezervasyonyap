'use client'

import { ButtonCircle } from '@/shared/Button'
import { variants } from '@/utils/animationVariants'
import { ArrowLeft02Icon, ArrowRight02Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import clsx from 'clsx'
import { AnimatePresence, motion, MotionConfig } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useSwipeable } from 'react-swipeable'
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
  const [loaded, setLoaded] = useState(false)
  const [index, setIndex] = useState(0)
  const [direction, setDirection] = useState(0)
  const urlStrings = galleryToUrlStrings(galleryImgs ?? [])
  const images = urlStrings.length > 0 ? urlStrings : [FALLBACK_LISTING_IMG]

  useEffect(() => {
    setIndex((i) => Math.min(i, Math.max(0, images.length - 1)))
  }, [images.length])

  function changePhotoId(newVal: number) {
    if (newVal > index) {
      setDirection(process.env.NEXT_PUBLIC_THEME_DIR === 'rtl' ? -1 : 1)
    } else {
      setDirection(process.env.NEXT_PUBLIC_THEME_DIR === 'rtl' ? 1 : -1)
    }
    setIndex(newVal)
  }

  const handlers = useSwipeable({
    onSwipedLeft: () => {
      if (process.env.NEXT_PUBLIC_THEME_DIR === 'rtl') {
        if (index > 0) {
          changePhotoId(index - 1)
        }
      } else if (index < images?.length - 1) {
        changePhotoId(index + 1)
      }
    },
    onSwipedRight: () => {
      if (process.env.NEXT_PUBLIC_THEME_DIR === 'rtl') {
        if (index < images?.length - 1) {
          changePhotoId(index + 1)
        }
      } else if (index > 0) {
        changePhotoId(index - 1)
      }
    },
    trackMouse: true,
  })

  const currentSrc = images[index] ?? images[0]

  return (
    <MotionConfig
      transition={{
        x: { type: 'spring', stiffness: 300, damping: 30 },
        opacity: { duration: 0.2 },
      }}
    >
      <div className={clsx(`group/cardGallerySlider group relative`, className)} {...handlers}>
        {/* Main image */}
        <div className={clsx(`w-full overflow-hidden rounded-xl`, galleryClass)}>
          <Link href={href} className={clsx(`relative flex items-center justify-center`, ratioClass)}>
            <AnimatePresence initial={false} custom={direction}>
              <motion.div
                key={uniqueID ? `${uniqueID}-${index}` : index}
                custom={direction}
                variants={variants(340, 1)}
                initial="enter"
                animate="center"
                exit="exit"
                className="absolute inset-0"
              >
                <Image
                  src={currentSrc}
                  fill
                  alt="listing card gallery"
                  className={clsx(`rounded-xl object-cover`, imageClass)}
                  onLoad={() => setLoaded(true)}
                  sizes="(max-width: 1025px) 100vw, 25vw"
                  unoptimized={
                    currentSrc.startsWith('http') ||
                    currentSrc.startsWith('/uploads/') ||
                    currentSrc.startsWith('data:')
                  }
                />
              </motion.div>
            </AnimatePresence>
          </Link>
        </div>

        {/* Buttons + bottom nav bar */}
        <>
          {/* Buttons */}
          {loaded && navigation && (
            <div className="opacity-0 transition-opacity group-hover/cardGallerySlider:opacity-100">
              {index > 0 && (
                <div className="absolute start-3 top-[calc(50%-1rem)]">
                  <ButtonCircle color="white" onClick={() => changePhotoId(index - 1)} className={'size-8!'}>
                    <HugeiconsIcon icon={ArrowLeft02Icon} className="size-4! rtl:rotate-180" strokeWidth={1.75} />
                  </ButtonCircle>
                </div>
              )}
              {index + 1 < images.length && (
                <div className="absolute end-3 top-[calc(50%-1rem)]">
                  <ButtonCircle color="white" onClick={() => changePhotoId(index + 1)} className={'size-8!'}>
                    <HugeiconsIcon icon={ArrowRight02Icon} className="size-4! rtl:rotate-180" strokeWidth={1.75} />
                  </ButtonCircle>
                </div>
              )}
            </div>
          )}

          {/* Bottom Nav bar */}
          <div
            className={clsx(
              'absolute inset-x-0 bottom-0 h-10 bg-linear-to-t from-neutral-900 opacity-50',
              bottomOverlayClassName,
            )}
          ></div>
          <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 items-center justify-center gap-x-1.5">
            {images.map((_, i) => (
              <button
                className={`h-1.5 w-1.5 rounded-full ${i === index ? 'bg-white' : 'bg-white/60'}`}
                onClick={() => changePhotoId(i)}
                key={i}
              />
            ))}
          </div>
        </>
      </div>
    </MotionConfig>
  )
}
