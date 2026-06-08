'use client'

import { useCarouselDotButton } from '@/hooks/use-carousel-dot-buttons'
import qlImage from '@/images/avatars/ql.png'
import qrImage from '@/images/avatars/qr.png'
import Avatar from '@/shared/Avatar'
import HeadingWithSub from '@/shared/Heading'
import { StarIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import clsx from 'clsx'
import type { EmblaOptionsType } from 'embla-carousel'
import Autoplay from 'embla-carousel-autoplay'
import useEmblaCarousel from 'embla-carousel-react'
import Image from 'next/image'
import { FC } from 'react'

const AVATAR_BG = [
  'bg-sky-500 text-white',
  'bg-pink-500 text-white',
  'bg-teal-500 text-white',
  'bg-amber-500 text-white',
  'bg-violet-500 text-white',
  'bg-cyan-500 text-white',
  'bg-rose-500 text-white',
  'bg-indigo-500 text-white',
]

/** Yüzen küçük avatarlar — renkli yarım daire vurguları */
const FLOATING_POSITIONS: { className: string; accent: string }[] = [
  { className: 'top-4 -left-4 md:-left-16', accent: 'bg-pink-200/80 dark:bg-pink-900/40' },
  { className: 'top-24 -right-2 md:right-4 md:top-8', accent: 'bg-sky-200/80 dark:bg-sky-900/40' },
  { className: 'bottom-32 -left-6 md:left-8', accent: 'bg-teal-200/80 dark:bg-teal-900/40' },
  { className: 'bottom-20 -right-4 md:right-12 md:bottom-24', accent: 'bg-amber-200/80 dark:bg-amber-900/40' },
  { className: 'top-1/2 -left-2 md:-left-8 -translate-y-1/2', accent: 'bg-violet-200/80 dark:bg-violet-900/40' },
  { className: 'top-1/3 -right-2 md:-right-12', accent: 'bg-cyan-200/80 dark:bg-cyan-900/40' },
]

export type ClientSaySlideItem = {
  id: string | number
  clientName: string
  content: string
  rating?: number
  /** Baş harf avatarı — yoksa isimden türetilir */
  initials?: string
}

export function getClientSayInitials(name: string): string {
  const trimmed = name.trim()
  if (!trimmed) return '?'
  const parts = trimmed.split(/\s+/).filter(Boolean)
  if (parts.length === 1) {
    const p = parts[0]!
    return p.length <= 2 ? p : p.slice(0, 2)
  }
  const first = parts[0]![0] ?? ''
  const last = parts[parts.length - 1]!.replace(/\./g, '')[0] ?? ''
  return `${first}${last}`
}

function resolveInitials(item: ClientSaySlideItem): string {
  if (item.initials?.trim()) return item.initials.trim()
  return getClientSayInitials(item.clientName)
}

function avatarBg(index: number): string {
  return AVATAR_BG[index % AVATAR_BG.length]!
}

function FeaturedAvatar({ initials, alt, colorIndex }: { initials: string; alt: string; colorIndex: number }) {
  return (
    <div className="relative mx-auto flex h-36 w-36 shrink-0 items-end justify-center md:h-40 md:w-40">
      <div
        className="absolute bottom-2 left-1/2 h-[72px] w-[140px] -translate-x-1/2 rounded-t-full bg-sky-100 dark:bg-sky-900/35 md:h-[80px] md:w-[156px]"
        aria-hidden
      />
      <div className="relative z-10 overflow-hidden rounded-full bg-white p-1 shadow-lg ring-4 ring-white dark:bg-neutral-900 dark:ring-neutral-800">
        <Avatar
          initials={initials}
          alt={alt}
          className={clsx('size-28 md:size-32', avatarBg(colorIndex))}
        />
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
  /** API veya CMS — boşsa bölüm gösterilmez */
  items?: ClientSaySlideItem[]
}

const SectionClientSay: FC<SectionClientSayProps> = (props) => {
  if (!props.items?.length) return null
  return <SectionClientSayInner {...props} items={props.items} />
}

const SectionClientSayInner: FC<SectionClientSayProps & { items: ClientSaySlideItem[] }> = ({
  className,
  emblaOptions = {
    slidesToScroll: 1,
    loop: true,
  },
  heading = 'Misafirlerimiz Ne Diyor? 🥇',
  subHeading = 'Bizimle seyahat eden gezginlerin gerçek yorumları.',
  items: slides,
}) => {
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
  const featuredInitials = current ? resolveInitials(current) : '?'

  return (
    <div className={clsx('relative flow-root overflow-hidden pb-24 md:pb-0', className)}>
      <HeadingWithSub subheading={subHeading} isCenter>
        {heading}
      </HeadingWithSub>

      <div className="relative mx-auto max-w-2xl px-2 md:px-0">
        <div className="pointer-events-none absolute inset-0 hidden md:block" aria-hidden>
          {FLOATING_POSITIONS.map((pos, i) => {
            const slide = slides[i % slides.length]
            const initials = slide ? resolveInitials(slide) : '?'
            return (
              <div key={i} className={clsx('absolute size-14', pos.className)}>
                <div className={clsx('absolute -inset-1 rounded-full opacity-90 blur-[2px]', pos.accent)} />
                <div className="relative size-14 overflow-hidden rounded-full ring-2 ring-white shadow-md dark:ring-neutral-800">
                  <Avatar initials={initials} alt="" className={clsx('size-14', avatarBg(i))} />
                </div>
              </div>
            )
          })}
        </div>

        <div className="relative z-[1] flex justify-center">
          <FeaturedAvatar initials={featuredInitials} alt={current?.clientName ?? ''} colorIndex={selectedIndex} />
        </div>

        <div className="relative z-[1] mt-2 md:mt-4">
          <div className="relative px-2 pt-2">
            <Image
              className="pointer-events-none absolute top-3 right-full z-0 -mr-8 size-10 object-contain opacity-70 sm:-mr-12 md:-mr-16 md:size-12 md:opacity-100"
              src={qlImage}
              alt=""
              width={48}
              height={48}
            />
            <Image
              className="pointer-events-none absolute top-3 left-full z-0 -ml-8 size-10 object-contain opacity-70 sm:-ml-12 md:-ml-16 md:size-12 md:opacity-100"
              src={qrImage}
              alt=""
              width={48}
              height={48}
            />
            <div className="embla overflow-hidden" ref={emblaRef}>
              <ul className="embla__container flex">
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
