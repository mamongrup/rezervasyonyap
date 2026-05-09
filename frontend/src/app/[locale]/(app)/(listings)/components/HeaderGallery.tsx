'use client'

import { Button } from '@/shared/Button'
import ButtonClose from '@/shared/ButtonClose'
import T from '@/utils/getT'
import { CloseButton, Dialog, DialogBackdrop, DialogPanel } from '@headlessui/react'
import { GridIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import clsx from 'clsx'
import { EmblaOptionsType } from 'embla-carousel'
import useEmblaCarousel from 'embla-carousel-react'
import Image from 'next/image'
import { useCallback, useEffect, useState } from 'react'

const emblaThemeDirection =
  process.env.NEXT_PUBLIC_THEME_DIR === 'rtl' ? ('rtl' as const) : ('ltr' as const)

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
      <div className="embla__viewport relative mx-auto h-full min-h-0 w-full flex-1 overflow-hidden" ref={emblaMainRef}>
        <div className="embla__container flex h-full">
          {images.map((image, index) => (
            <div
              className="relative flex min-h-0 flex-[0_0_100%] embla__slide items-center justify-center"
              key={index}
            >
              <div className="relative h-[min(91vh,960px)] w-full max-w-[1920px] px-1">
                <Image
                  alt=""
                  src={image}
                  fill
                  sizes="100vw"
                  className="object-contain"
                  priority={index === 0}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="absolute inset-0 flex items-center justify-center">
          <div className="absolute top-2.5 right-2.5 z-50 sm:top-4 sm:right-4">
            <CloseButton as={ButtonClose}>
              <span className="sr-only">Close</span>
            </CloseButton>
          </div>
        </div>
      </div>

      <div className="embla-thumbs fixed inset-x-0 bottom-5 z-10">
        <div className="embla-thumbs__viewport mx-auto max-w-28" ref={emblaThumbsRef}>
          <div className="embla-thumbs__container flex">
            {images.map((image, index) => (
              <div
                key={index}
                className={clsx(
                  'relative flex aspect-5/3 w-24 shrink-0 items-center justify-center transition-[transform,filter] duration-300 ease-in-out',
                  index === selectedIndex
                    ? 'z-10 scale-125 overflow-hidden rounded-md brightness-100'
                    : 'brightness-50 hover:brightness-75'
                )}
                onClick={() => onThumbClick(index)}
              >
                <Image alt="Slide image" src={image} fill sizes="100px" className={'object-cover'} />
              </div>
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
const HeaderGallery = ({ images, gridType = 'grid1' }: Props) => {
  let [isOpen, setIsOpen] = useState(false)
  let [startIndex, setStartIndex] = useState(0)

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
      {gridType === 'grid1' && <HeaderGalleryGrid1 images={images} handleOpenDialog={handleOpenDialog} />}
      {gridType === 'grid2' && <HeaderGalleryGrid2 images={images} handleOpenDialog={handleOpenDialog} />}
      {gridType === 'grid3' && <HeaderGalleryGrid3 images={images} handleOpenDialog={handleOpenDialog} />}
      {gridType === 'grid4' && <HeaderGalleryGrid4 images={images} handleOpenDialog={handleOpenDialog} />}

      {/* Dialog for full-screen image gallery */}
      <Dialog open={isOpen} onClose={() => setIsOpen(false)} className="relative z-50">
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
}: {
  images: string[]
  handleOpenDialog: (index?: number) => void
}) => {
  return (
    <header className="relative md:grid md:grid-cols-4 md:gap-2">
      <div className="relative aspect-4/5 size-full md:col-span-2 md:aspect-4/4" onClick={() => handleOpenDialog(0)}>
        {images[0] && (
          <Image
            fill
            className="rounded-xl object-cover transition-[filter] hover:brightness-75"
            src={images[0]}
            alt="bigger"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 80vw"
            priority
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
                sizes="(max-width: 768px) 33vw, 33vw"
                priority
              />
            </div>
          )
        })}
      </div>

      <div className="absolute bottom-3 left-3">
        <Button color="light" onClick={() => handleOpenDialog()}>
          <HugeiconsIcon icon={GridIcon} className="h-5 w-5" strokeWidth={1.75} />
          <span>{T['common']['Show all photos']}</span>
        </Button>
      </div>
    </header>
  )
}
const HeaderGalleryGrid2 = ({
  images,
  handleOpenDialog,
}: {
  images: string[]
  handleOpenDialog: (index?: number) => void
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
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 80vw"
            priority
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
                sizes="(max-width: 768px) 33vw, 33vw"
                priority
              />
            </div>
          )
        })}
      </div>

      <div className="absolute bottom-3 left-3">
        <Button color="light" onClick={() => handleOpenDialog()}>
          <HugeiconsIcon icon={GridIcon} className="h-5 w-5" strokeWidth={1.75} />
          <span>{T['common']['Show all photos']}</span>
        </Button>
      </div>
    </header>
  )
}
const HeaderGalleryGrid3 = ({
  images,
  handleOpenDialog,
}: {
  images: string[]
  handleOpenDialog: (index?: number) => void
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
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 80vw"
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
              sizes="(max-width: 768px) 33vw, 33vw"
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
              sizes="(max-width: 768px) 33vw, 33vw"
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
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 80vw"
            priority
          />
        )}
      </div>

      <div className="absolute bottom-3 left-3">
        <Button color="light" onClick={() => handleOpenDialog()}>
          <HugeiconsIcon icon={GridIcon} className="h-5 w-5" strokeWidth={1.75} />
          <span>{T['common']['Show all photos']}</span>
        </Button>
      </div>
    </header>
  )
}
const HeaderGalleryGrid4 = ({
  images,
  handleOpenDialog,
}: {
  images: string[]
  handleOpenDialog: (index?: number) => void
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
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 80vw"
            priority
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
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 80vw"
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
              sizes="(max-width: 768px) 33vw, 33vw"
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
              sizes="(max-width: 768px) 33vw, 33vw"
              priority
            />
          )}
        </div>
      </div>

      <div className="absolute bottom-3 left-3">
        <Button color="light" onClick={() => handleOpenDialog()}>
          <HugeiconsIcon icon={GridIcon} className="h-5 w-5" strokeWidth={1.75} />
          <span>{T['common']['Show all photos']}</span>
        </Button>
      </div>
    </header>
  )
}

export default HeaderGallery
