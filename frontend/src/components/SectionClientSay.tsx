'use client'

import { useCarouselDotButton } from '@/hooks/use-carousel-dot-buttons'
import userImage1 from '@/images/avatars/1.png'
import userImage2 from '@/images/avatars/2.png'
import userImage3 from '@/images/avatars/3.png'
import userImage4 from '@/images/avatars/4.png'
import userImage5 from '@/images/avatars/5.png'
import userImage6 from '@/images/avatars/6.png'
import userImage7 from '@/images/avatars/7.png'
import qlImage from '@/images/avatars/ql.png'
import qrImage from '@/images/avatars/qr.png'
import HeadingWithSub from '@/shared/Heading'
import { StarIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import clsx from 'clsx'
import type { EmblaOptionsType } from 'embla-carousel'
import Autoplay from 'embla-carousel-autoplay'
import useEmblaCarousel from 'embla-carousel-react'
import Image, { type StaticImageData } from 'next/image'
import { FC, useMemo } from 'react'

const AVATAR_POOL: StaticImageData[] = [
  userImage1,
  userImage2,
  userImage3,
  userImage4,
  userImage5,
  userImage6,
  userImage7,
]

/** Yüzen küçük avatarlar — renkli yarım daire vurguları */
const FLOATING: { src: StaticImageData; className: string; accent: string }[] = [
  { src: userImage2, className: 'top-4 -left-4 md:-left-16', accent: 'bg-pink-200/80 dark:bg-pink-900/40' },
  { src: userImage3, className: 'top-24 -right-2 md:right-4 md:top-8', accent: 'bg-sky-200/80 dark:bg-sky-900/40' },
  { src: userImage4, className: 'bottom-32 -left-6 md:left-8', accent: 'bg-teal-200/80 dark:bg-teal-900/40' },
  { src: userImage5, className: 'bottom-20 -right-4 md:right-12 md:bottom-24', accent: 'bg-amber-200/80 dark:bg-amber-900/40' },
  { src: userImage6, className: 'top-1/2 -left-2 md:-left-8 -translate-y-1/2', accent: 'bg-violet-200/80 dark:bg-violet-900/40' },
  { src: userImage7, className: 'top-1/3 -right-2 md:-right-12', accent: 'bg-cyan-200/80 dark:bg-cyan-900/40' },
]

export type ClientSaySlideItem = {
  id: string | number
  clientName: string
  content: string
  rating?: number
  /** Harici URL veya statik görsel — yoksa slayta göre döner */
  avatar?: StaticImageData | string
}

const DEMO_DATA: ClientSaySlideItem[] = [
  {
    id: 1,
    clientName: 'Tiana Abie',
    content:
      'Great quality products, affordable prices, fast and friendly delivery. I very recommend.',
    rating: 5,
    avatar: userImage1,
  },
  {
    id: 2,
    clientName: 'Lennie Swiffan',
    content:
      'Great quality products, affordable prices, fast and friendly delivery. I very recommend.',
    rating: 5,
    avatar: userImage2,
  },
  {
    id: 3,
    clientName: 'Berta Emili',
    content:
      'Great quality products, affordable prices, fast and friendly delivery. I very recommend.',
    rating: 5,
    avatar: userImage3,
  },
]

function resolveSlideAvatar(item: ClientSaySlideItem, index: number): StaticImageData | string {
  if (item.avatar) return item.avatar
  return AVATAR_POOL[index % AVATAR_POOL.length]
}

function FeaturedAvatar({ src, alt }: { src: StaticImageData | string; alt: string }) {
  const isRemote = typeof src === 'string'
  return (
    <div className="relative mx-auto flex h-36 w-36 shrink-0 items-end justify-center md:h-40 md:w-40">
      {/* Açık mavi yarım daire vurgusu */}
      <div
        className="absolute bottom-2 left-1/2 h-[72px] w-[140px] -translate-x-1/2 rounded-t-full bg-sky-100 dark:bg-sky-900/35 md:h-[80px] md:w-[156px]"
        aria-hidden
      />
      <div className="relative z-10 overflow-hidden rounded-full bg-white p-1 shadow-lg ring-4 ring-white dark:bg-neutral-900 dark:ring-neutral-800">
        {isRemote ? (
          // eslint-disable-next-line @next/next/no-img-element -- harici API URL
          <img src={src} alt={alt} className="size-28 rounded-full object-cover md:size-32" />
        ) : (
          <Image src={src} alt={alt} className="size-28 rounded-full object-cover md:size-32" sizes="128px" />
        )}
      </div>
    </div>
  )
}

function StarRow({ rating = 5 }: { rating?: number }) {
  const r = Math.min(5, Math.max(0, Math.round(rating)))
  return (
    <div className="mt-4 flex justify-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <HugeiconsIcon
          key={i}
          icon={StarIcon}
          className={clsx(
            'size-6 md:size-7',
            i < r ? 'text-amber-400' : 'text-neutral-200 dark:text-neutral-600',
          )}
          strokeWidth={1.75}
        />
      ))}
    </div>
  )
}

interface SectionClientSayProps {
  className?: string
  emblaOptions?: EmblaOptionsType
  heading?: string
  subHeading?: string
  /** API veya CMS — verilmezse demo veri */
  items?: ClientSaySlideItem[]
}

const SectionClientSay: FC<SectionClientSayProps> = ({
  className,
  emblaOptions = {
    slidesToScroll: 1,
    loop: true,
  },
  heading = 'Misafirlerimiz Ne Diyor? 🥇',
  subHeading = 'Bizimle seyahat eden gezginlerin gerçek yorumları.',
  items: itemsProp,
}) => {
  const slides = useMemo(
    () => (itemsProp && itemsProp.length > 0 ? itemsProp : DEMO_DATA),
    [itemsProp],
  )

  const emblaDirection: 'ltr' | 'rtl' =
    process.env.NEXT_PUBLIC_THEME_DIR === 'rtl' ? 'rtl' : 'ltr'
  const [emblaRef, emblaApi] = useEmblaCarousel(
    {
      ...emblaOptions,
      direction: emblaDirection,
    },
    [Autoplay({ playOnInit: true, delay: 4500 })],
  )
  const { selectedIndex, scrollSnaps, onDotButtonClick } = useCarouselDotButton(emblaApi)

  const current = slides[selectedIndex] ?? slides[0]
  const featuredSrc = current ? resolveSlideAvatar(current, selectedIndex) : userImage1

  return (
    <div className={clsx('relative flow-root', className)}>
      <HeadingWithSub subheading={subHeading} isCenter>
        {heading}
      </HeadingWithSub>

      <div className="relative mx-auto max-w-2xl px-2 md:px-0">
        {/* Yüzen avatarlar — tablet+ */}
        <div className="pointer-events-none absolute inset-0 hidden md:block" aria-hidden>
          {FLOATING.map((f, i) => (
            <div
              key={i}
              className={clsx('absolute size-14', f.className)}
            >
              <div
                className={clsx(
                  'absolute -inset-1 rounded-full opacity-90 blur-[2px]',
                  f.accent,
                )}
              />
              <div className="relative overflow-hidden rounded-full ring-2 ring-white shadow-md dark:ring-neutral-800">
                <Image src={f.src} alt="" className="size-14 object-cover" sizes="56px" />
              </div>
            </div>
          ))}
        </div>

        {/* Öne çıkan profil — aktif slayta göre */}
        <div className="relative z-[1] flex justify-center">
          <FeaturedAvatar src={featuredSrc} alt={current?.clientName ?? ''} />
        </div>

        {/* Alıntı + carousel */}
        <div className="relative z-[1] mt-2 md:mt-4">
          <div className="relative px-2 pt-2">
            <Image
              className="pointer-events-none absolute top-3 right-full z-0 -mr-8 size-10 opacity-70 sm:-mr-12 md:-mr-16 md:size-12 md:opacity-100"
              src={qlImage}
              alt=""
            />
            <Image
              className="pointer-events-none absolute top-3 left-full z-0 -ml-8 size-10 opacity-70 sm:-ml-12 md:-ml-16 md:size-12 md:opacity-100"
              src={qrImage}
              alt=""
            />
            <div className="embla overflow-hidden" ref={emblaRef}>
              <ul className="embla__container">
                {slides.map((item) => (
                  <li
                    key={item.id}
                    className="embla__slide flex basis-full flex-col items-center px-2 text-center"
                  >
                    <span className="block max-w-xl text-base leading-relaxed text-neutral-700 md:text-lg dark:text-neutral-300">
                      {item.content}
                    </span>
                    <span className="mt-6 block text-lg font-semibold text-neutral-900 md:text-xl dark:text-white">
                      {item.clientName}
                    </span>
                    <StarRow rating={item.rating} />
                  </li>
                ))}
              </ul>
            </div>

            <div className="embla__dots flex items-center justify-center gap-1 pt-8">
              {scrollSnaps.map((_, index) => (
                <button
                  type="button"
                  key={index}
                  aria-label={`Yorum ${index + 1}`}
                  aria-current={index === selectedIndex ? 'true' : undefined}
                  onClick={() => onDotButtonClick(index)}
                  className="flex size-11 items-center justify-center rounded-full transition focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                >
                  <span
                    aria-hidden="true"
                    className={clsx(
                      'block size-2.5 rounded-full transition',
                      index === selectedIndex
                        ? 'bg-neutral-800 dark:bg-neutral-200'
                        : 'bg-neutral-400 dark:bg-neutral-500',
                    )}
                  />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SectionClientSay
