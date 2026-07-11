'use client'

import { Button } from '@/shared/Button'
import { useRegisterVitrinOverlay, vitrinOverlayDialogClassName } from '@/components/aside/aside'
import ButtonClose from '@/shared/ButtonClose'
import { getMessages } from '@/utils/getT'
import { CloseButton, Dialog, DialogBackdrop, DialogPanel } from '@headlessui/react'
import { Album02Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import clsx from 'clsx'
import { EmblaOptionsType } from 'embla-carousel'
import useEmblaCarousel from 'embla-carousel-react'
import Image from 'next/image'
import { useParams } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'

const emblaThemeDirection =
  process.env.NEXT_PUBLIC_THEME_DIR === 'rtl' ? ('rtl' as const) : ('ltr' as const)

/** Grid düzenine göre gerçek görüntülenen genişlik ipucu (`images.unoptimized` kapalıysa srcset için). */
const SZ_GRID1_HERO = '(max-width: 768px) 100vw, 50vw'
const SZ_GRID1_QUAD = '(max-width: 768px) 50vw, 25vw'
const SZ_GRID2_MAIN = '(max-width: 768px) 100vw, 75vw'
const SZ_GRID2_SIDE = '(max-width: 768px) 33vw, 25vw'
const SZ_GRID3_LARGE = '(max-width: 768px) 100vw, 34vw'
const SZ_GRID3_SMALL = '(max-width: 768px) 50vw, 34vw'
const SZ_LIGHTBOX_MAIN = '(max-width: 768px) 100vw, min(1920px, 100vw)'

const EmblaCarousel = ({ images, option }: { images: string[]; option: EmblaOptionsType }) => {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [emblaMainRef, emblaMainApi] = useEmblaCarousel({
    ...option,
    direction: emblaThemeDirection,
  })
  const [emblaThumbsRef, emblaThumbsApi] = useEmblaCarousel({
    ...option,
    containScroll: 'keepSnaps',
    dragFree: true,
    direction: emblaThemeDirection,
  })

  const onThumbClick = useCallback(
    (index: number) => {
      if (!emblaMainApi || !emblaThumbsApi) return
      emblaMainApi.scrollTo(index)
    },
    [emblaMainApi, emblaThumbsApi]
  )

  const onSelect = useCallback(() => {
    if (!emblaMainApi || !emblaThumbsApi) return
    setSelectedIndex(emblaMainApi.selectedScrollSnap())
    emblaThumbsApi.scrollTo(emblaMainApi.selectedScrollSnap())
  }, [emblaMainApi, emblaThumbsApi, setSelectedIndex])

  useEffect(() => {
    if (!emblaMainApi) return
    onSelect()

    emblaMainApi.on('select', onSelect).on('reInit', onSelect)
  }, [emblaMainApi, onSelect])

  return (
    <div className="relative flex min-h-0 w-full flex-1 flex-col embla">
      {/* Kapatma butonu — viewport dışında, her zaman üstte ve ekrana sabit */}
      <div className="fixed top-3 right-3 z-[60] sm:top-4 sm:right-4">
        <CloseButton as={ButtonClose}>
          <span className="sr-only">Close</span>
        </CloseButton>
      </div>

      <div className="embla__viewport relative mx-auto h-full min-h-0 w-full flex-1 overflow-hidden" ref={emblaMainRef}>
        <div className="embla__container flex h-full">
          {images.map((image, index) => (
            <div
              className="relative flex h-full min-h-0 flex-[0_0_100%] embla__slide items-center justify-center"
              key={index}
            >
              <div className="relative h-full w-full max-w-[1920px] px-1">
                <Image
                  alt=""
                  src={image}
                  fill
                  sizes={SZ_LIGHTBOX_MAIN}
                  className="object-contain"
                  priority={index === 0}
                  fetchPriority={index === 0 ? 'high' : 'low'}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="embla-thumbs z-10 mt-3 shrink-0 pb-[max(env(safe-area-inset-bottom),0.75rem)]">
        <div className="embla-thumbs__viewport mx-auto max-w-full px-4" ref={emblaThumbsRef}>
          <div className="embla-thumbs__container flex gap-2">
            {images.map((image, index) => (
              <button
                type="button"
                key={index}
                className={clsx(
                  'relative flex aspect-5/3 w-16 shrink-0 items-center justify-center overflow-hidden rounded-md transition-[transform,filter] duration-300 ease-in-out sm:w-20',
                  index === selectedIndex
                    ? 'z-10 ring-2 ring-white brightness-100'
                    : 'brightness-50 hover:brightness-75'
                )}
                onClick={() => onThumbClick(index)}
              >
                <Image alt="Slide image" src={image} fill sizes="100px" className={'object-cover'} />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

interface Props {
  images: string[]
  gridType?: 'grid1' | 'grid2' | 'grid3' | 'grid4'
}

function GalleryShowAllOverlay({
  label,
  onOpen,
}: {
  label: string
  onOpen: () => void
}) {
  return (
    <div className="absolute bottom-3 left-3">
      <Button type="button" color="light" onClick={onOpen} aria-label={label}>
        <HugeiconsIcon icon={Album02Icon} className="h-5 w-5 shrink-0" strokeWidth={1.75} />
        <span>{label}</span>
      </Button>
    </div>
  )
}

const HeaderGallery = ({ images, gridType = 'grid1' }: Props) => {
  let [isOpen, setIsOpen] = useState(false)
  let [startIndex, setStartIndex] = useState(0)
  useRegisterVitrinOverlay(isOpen)

  const params = useParams()
  const locale = typeof params?.locale === 'string' ? params.locale : 'tr'
  const showAllPhotosLabel = useMemo(() => {
    const m = getMessages(locale)
    return m.common['Show all photos'] ?? 'Show all photos'
  }, [locale])

  const carouselSlides = images.filter((u) => u.trim())

  const handleOpenDialog = (gridIndex?: number) => {
    let carouselIdx = 0
    if (gridIndex !== undefined && gridIndex >= 0) {
      const url = images[gridIndex]?.trim()
      if (url) {
        const pos = carouselSlides.indexOf(url)
        carouselIdx = pos >= 0 ? pos : 0
      }
    }
    setStartIndex(carouselIdx)
    setIsOpen(true)
  }

  return (
    <>
      {gridType === 'grid1' && (
        <HeaderGalleryGrid1
          images={images}
          handleOpenDialog={handleOpenDialog}
          showAllPhotosLabel={showAllPhotosLabel}
        />
      )}
      {gridType === 'grid2' && (
        <HeaderGalleryGrid2
          images={images}
          handleOpenDialog={handleOpenDialog}
          showAllPhotosLabel={showAllPhotosLabel}
        />
      )}
      {gridType === 'grid3' && (
        <HeaderGalleryGrid3
          images={images}
          handleOpenDialog={handleOpenDialog}
          showAllPhotosLabel={showAllPhotosLabel}
        />
      )}
      {gridType === 'grid4' && (
        <HeaderGalleryGrid4
          images={images}
          handleOpenDialog={handleOpenDialog}
          showAllPhotosLabel={showAllPhotosLabel}
        />
      )}

      {/* Dialog for full-screen image gallery */}
      <Dialog open={isOpen} onClose={() => setIsOpen(false)} className={vitrinOverlayDialogClassName}>
        {/* The backdrop, rendered as a fixed sibling to the panel container */}
        <DialogBackdrop className="fixed inset-0 bg-black" />

        {/* Full-screen container to center the panel */}
        <div className="fixed inset-0 flex w-screen items-center justify-center">
            <DialogPanel
            transition
            className="relative mx-auto flex h-[min(94vh,1020px)] min-h-0 w-full max-w-[min(98vw,1760px)] flex-col transition data-closed:opacity-0"
          >
            <EmblaCarousel images={carouselSlides} option={{ startIndex, slidesToScroll: 1 }} />
          </DialogPanel>
        </div>
      </Dialog>
    </>
  )
}

const HeaderGalleryGrid1 = ({
  images,
  handleOpenDialog,
  showAllPhotosLabel,
}: {
  images: string[]
  handleOpenDialog: (index?: number) => void
  showAllPhotosLabel: string
}) => {
  return (
    <header className="relative md:grid md:grid-cols-4 md:gap-2">
      <div className="relative aspect-4/5 size-full md:col-span-2 md:aspect-4/4" onClick={() => handleOpenDialog(0)}>
        {images[0] && (
          <Image
            fill
            className="rounded-xl object-cover brightness-100 transition-[filter] hover:brightness-75"
            src={images[0]}
            alt="bigger"
            sizes={SZ_GRID1_HERO}
            priority
            fetchPriority="high"
          />
        )}
      </div>
      <div className="hidden md:col-span-2 md:grid md:grid-cols-2 md:gap-2">
        {images.slice(1, 5).map((item, index) => {
          const url = item?.trim()
          if (!url) return null
          const idx = index + 1
          return (
            <div className="relative aspect-2/2 size-full" key={`${idx}-${url}`} onClick={() => handleOpenDialog(idx)}>
              <Image
                fill
                className="rounded-xl object-cover brightness-100 transition-[filter] hover:brightness-75"
                src={url}
                alt="others"
                sizes={SZ_GRID1_QUAD}
                priority
              />
            </div>
          )
        })}
      </div>

      <GalleryShowAllOverlay label={showAllPhotosLabel} onOpen={() => handleOpenDialog()} />
    </header>
  )
}
const HeaderGalleryGrid2 = ({
  images,
  handleOpenDialog,
  showAllPhotosLabel,
}: {
  images: string[]
  handleOpenDialog: (index?: number) => void
  showAllPhotosLabel: string
}) => {
  return (
    <header className="relative md:grid md:grid-cols-4">
      <div className="relative aspect-4/5 size-full md:col-span-3 md:aspect-5/4" onClick={() => handleOpenDialog(0)}>
        {images[0] && (
          <Image
            alt=""
            src={images[0]}
            fill
            className="rounded-xl object-cover brightness-100 transition-[filter] hover:brightness-75"
            sizes={SZ_GRID2_MAIN}
            priority
            fetchPriority="high"
          />
        )}
      </div>

      <div className="hidden md:grid md:grid-cols-1 md:gap-y-2 md:ps-2">
        {images.slice(1, 4).map((item, index) => {
          const url = item?.trim()
          if (!url) return null
          const idx = index + 1
          return (
            <div className="relative aspect-3/2 size-full" key={`${idx}-${url}`} onClick={() => handleOpenDialog(idx)}>
              <Image
                alt=""
                src={url}
                fill
                className="rounded-xl object-cover brightness-100 transition-[filter] hover:brightness-75"
                sizes={SZ_GRID2_SIDE}
                priority
              />
            </div>
          )
        })}
      </div>

      <GalleryShowAllOverlay label={showAllPhotosLabel} onOpen={() => handleOpenDialog()} />
    </header>
  )
}
const HeaderGalleryGrid3 = ({
  images,
  handleOpenDialog,
  showAllPhotosLabel,
}: {
  images: string[]
  handleOpenDialog: (index?: number) => void
  showAllPhotosLabel: string
}) => {
  return (
    <header className="relative md:grid md:grid-cols-3 md:gap-x-2">
      <div className="relative aspect-4/5 size-full md:aspect-3/4" onClick={() => handleOpenDialog(0)}>
        {images[0] && (
          <Image
            alt=""
            src={images[0]}
            fill
            className="rounded-xl object-cover brightness-100 transition-[filter] hover:brightness-75"
            sizes={SZ_GRID3_LARGE}
            priority
            fetchPriority="high"
          />
        )}
      </div>

      <div className="hidden md:grid md:grid-cols-1 md:gap-y-2">
        <div className="relative aspect-3/2 size-full" onClick={() => handleOpenDialog(1)}>
          {images[1] && (
            <Image
              alt=""
              src={images[1]}
              fill
              className="rounded-xl object-cover brightness-100 transition-[filter] hover:brightness-75"
              sizes={SZ_GRID3_SMALL}
              priority
            />
          )}
        </div>
        <div className="relative aspect-3/2 size-full" onClick={() => handleOpenDialog(2)}>
          {images[2] && (
            <Image
              alt=""
              src={images[2]}
              fill
              className="rounded-xl object-cover brightness-100 transition-[filter] hover:brightness-75"
              sizes={SZ_GRID3_SMALL}
              priority
            />
          )}
        </div>
      </div>

      <div className="relative hidden size-full md:block md:aspect-3/4" onClick={() => handleOpenDialog(3)}>
        {images[3] && (
          <Image
            alt=""
            src={images[3]}
            fill
            className="rounded-xl object-cover brightness-100 transition-[filter] hover:brightness-75"
            sizes={SZ_GRID3_LARGE}
            priority
          />
        )}
      </div>

      <GalleryShowAllOverlay label={showAllPhotosLabel} onOpen={() => handleOpenDialog()} />
    </header>
  )
}
const HeaderGalleryGrid4 = ({
  images,
  handleOpenDialog,
  showAllPhotosLabel,
}: {
  images: string[]
  handleOpenDialog: (index?: number) => void
  showAllPhotosLabel: string
}) => {
  return (
    <header className="relative md:grid md:grid-cols-3 md:gap-x-2">
      <div className="relative aspect-4/5 size-full md:aspect-3/4" onClick={() => handleOpenDialog(0)}>
        {images[0] && (
          <Image
            alt=""
            src={images[0]}
            fill
            className="rounded-xl object-cover brightness-100 transition-[filter] hover:brightness-75"
            sizes={SZ_GRID3_LARGE}
            priority
            fetchPriority="high"
          />
        )}
      </div>

      <div className="relative hidden aspect-4/5 size-full md:block md:aspect-3/4" onClick={() => handleOpenDialog(3)}>
        {images[3] && (
          <Image
            alt=""
            src={images[3]}
            fill
            className="rounded-xl object-cover brightness-100 transition-[filter] hover:brightness-75"
            sizes={SZ_GRID3_LARGE}
            priority
          />
        )}
      </div>

      <div className="hidden md:grid md:grid-cols-1 md:gap-y-2">
        <div className="relative aspect-3/2 size-full" onClick={() => handleOpenDialog(1)}>
          {images[1] && (
            <Image
              alt=""
              src={images[1]}
              fill
              className="rounded-xl object-cover brightness-100 transition-[filter] hover:brightness-75"
              sizes={SZ_GRID3_SMALL}
              priority
            />
          )}
        </div>
        <div className="relative aspect-3/2 size-full" onClick={() => handleOpenDialog(2)}>
          {images[2] && (
            <Image
              alt=""
              src={images[2]}
              fill
              className="rounded-xl object-cover brightness-100 transition-[filter] hover:brightness-75"
              sizes={SZ_GRID3_SMALL}
              priority
            />
          )}
        </div>
      </div>

      <GalleryShowAllOverlay label={showAllPhotosLabel} onOpen={() => handleOpenDialog()} />
    </header>
  )
}

export default HeaderGallery
