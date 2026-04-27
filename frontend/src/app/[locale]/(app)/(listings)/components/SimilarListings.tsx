'use client'

import Image from 'next/image'
import Link from 'next/link'
import { ArrowLeft02Icon, ArrowRight02Icon, MapPinIcon, StarIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { ButtonCircle } from '@/shared/Button'
import clsx from 'clsx'
import { useCallback, useEffect, useRef, useState } from 'react'

interface SimilarListing {
  id: string
  title: string
  handle: string
  address: string
  price: string
  reviewStart: number
  reviewCount: number
  featuredImage: string
  listingCategory: string
  linkBase: string
  /** Tatil evi: misafir · oda · banyo (StayCard2 ile aynı `capacitySpec`) */
  capacityLine?: string | null
}

interface Props {
  listings: SimilarListing[]
  title?: string
  /** Örn. `/ gece` — vitrin dili */
  perNightSuffix?: string
  ariaPrev?: string
  ariaNext?: string
}

const SimilarListings = ({
  listings,
  title = 'Similar listings',
  perNightSuffix = '/ night',
  ariaPrev = 'Previous',
  ariaNext = 'Next',
}: Props) => {
  const scrollRef = useRef<HTMLDivElement>(null)
  const stepRef = useRef(280)
  const [overflow, setOverflow] = useState(false)
  const [atStart, setAtStart] = useState(true)
  const [atEnd, setAtEnd] = useState(false)

  const syncScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return

    // Tek seferde tüm layout okumalarını yap — forced reflow önlenir
    const scrollLeft = el.scrollLeft
    const scrollWidth = el.scrollWidth
    const clientWidth = el.clientWidth
    const canScroll = scrollWidth > clientWidth + 1
    setOverflow(canScroll)
    const item = el.querySelector('.mySnapItem') as HTMLElement | null
    if (item) stepRef.current = item.clientWidth + 16
    if (!canScroll) {
      setAtStart(true)
      setAtEnd(true)
      return
    }
    setAtStart(scrollLeft <= 2)
    setAtEnd(scrollLeft + clientWidth >= scrollWidth - 2)
  }, [])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return

    /** Birden fazla ResizeObserver tetiklemesini ve commit ile çakışmayı önlemek için tek rAF'da ölç */
    let syncRaf = 0
    const scheduleSync = () => {
      if (syncRaf) cancelAnimationFrame(syncRaf)
      syncRaf = requestAnimationFrame(() => {
        syncRaf = 0
        syncScroll()
      })
    }

    /** Çift rAF: font/görsel layout'u yerleştikten sonra ölç (forced reflow azaltır) */
    let initOuter: number | null = null
    let initInner: number | null = null
    initOuter = requestAnimationFrame(() => {
      initOuter = null
      initInner = requestAnimationFrame(() => {
        initInner = null
        syncScroll()
      })
    })

    el.addEventListener('scroll', scheduleSync, { passive: true })
    const ro = new ResizeObserver(scheduleSync)
    ro.observe(el)

    return () => {
      if (initOuter != null) cancelAnimationFrame(initOuter)
      if (initInner != null) cancelAnimationFrame(initInner)
      if (syncRaf) cancelAnimationFrame(syncRaf)
      el.removeEventListener('scroll', scheduleSync)
      ro.disconnect()
    }
  }, [listings, syncScroll])

  const scrollStep = useCallback(() => stepRef.current, [])

  const scrollPrev = () => {
    scrollRef.current?.scrollBy({ left: -scrollStep(), behavior: 'smooth' })
  }

  const scrollNext = () => {
    scrollRef.current?.scrollBy({ left: scrollStep(), behavior: 'smooth' })
  }

  if (!listings.length) return null

  return (
    <div className="listingSection__wrap min-w-0">
      <h2 className="text-2xl font-semibold">{title}</h2>

      <div className="relative mt-4 min-w-0">
        {overflow && (
          <>
            <div
              className={clsx(
                'pointer-events-none absolute inset-y-0 start-0 z-[1] w-10 bg-gradient-to-r from-white to-transparent sm:w-14 dark:from-neutral-950',
                atStart && 'opacity-0',
              )}
              aria-hidden
            />
            <div
              className={clsx(
                'pointer-events-none absolute inset-y-0 end-0 z-[1] w-10 bg-gradient-to-r from-transparent to-white sm:w-14 dark:to-neutral-950',
                atEnd && 'opacity-0',
              )}
              aria-hidden
            />
            <div className="absolute start-0 top-[38%] z-[2] -translate-y-1/2 sm:-start-1">
              <ButtonCircle
                type="button"
                color="white"
                className="shadow-md ring-1 ring-black/5 dark:ring-white/10"
                disabled={atStart}
                onClick={scrollPrev}
                aria-label={ariaPrev}
              >
                <HugeiconsIcon icon={ArrowLeft02Icon} className="size-5 rtl:rotate-180" strokeWidth={1.75} />
              </ButtonCircle>
            </div>
            <div className="absolute end-0 top-[38%] z-[2] -translate-y-1/2 sm:-end-1">
              <ButtonCircle
                type="button"
                color="white"
                className="shadow-md ring-1 ring-black/5 dark:ring-white/10"
                disabled={atEnd}
                onClick={scrollNext}
                aria-label={ariaNext}
              >
                <HugeiconsIcon icon={ArrowRight02Icon} className="size-5 rtl:rotate-180" strokeWidth={1.75} />
              </ButtonCircle>
            </div>
          </>
        )}

        <div
          ref={scrollRef}
          className="hidden-scrollbar flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-pl-4 scroll-pr-10 pb-4 pl-4 pr-10 sm:scroll-pl-6 sm:scroll-pr-12 sm:pl-6 sm:pr-12 lg:scroll-pl-0 lg:scroll-pr-10 lg:pl-0 lg:pr-10"
        >
          {listings.map((item) => (
            <div key={item.id} className="mySnapItem w-64 shrink-0 snap-start">
              <Link
                href={`${item.linkBase}/${item.handle}`}
                className="group block"
              >
                <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl">
                  <Image
                    src={item.featuredImage}
                    alt={item.title}
                    fill
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                    sizes="256px"
                  />
                </div>
                <div className="mt-3 space-y-1 px-1">
                  <p className="text-xs font-medium uppercase tracking-wide text-primary-500">
                    {item.listingCategory}
                  </p>
                  <h3 className="line-clamp-1 font-semibold text-neutral-900 transition-colors group-hover:text-primary-600 dark:text-white">
                    {item.title}
                  </h3>
                  <div className="flex items-center gap-1 text-sm text-neutral-500 dark:text-neutral-400">
                    <HugeiconsIcon icon={MapPinIcon} className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
                    <span className="line-clamp-1">{item.address}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2 pt-1">
                    <div className="flex min-w-0 flex-1 items-center gap-2">
                      {item.capacityLine ? (
                        <span className="line-clamp-1 text-sm text-neutral-500 dark:text-neutral-400">
                          {item.capacityLine}
                        </span>
                      ) : null}
                      <div className="flex shrink-0 items-center gap-1">
                        <HugeiconsIcon icon={StarIcon} className="h-4 w-4 text-yellow-400" strokeWidth={1.75} />
                        <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                          {item.reviewStart.toFixed(1)}
                        </span>
                        <span className="text-sm text-neutral-400">({item.reviewCount})</span>
                      </div>
                    </div>
                    <p className="shrink-0 font-semibold text-neutral-900 dark:text-white">
                      <span>{item.price}</span>
                      <span className="text-sm font-normal text-neutral-500"> {perNightSuffix}</span>
                    </p>
                  </div>
                </div>
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default SimilarListings
