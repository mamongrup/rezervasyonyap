'use client'

import SectionGridFeaturePlaces from '@/components/SectionGridFeaturePlaces'
import type {
  FeaturedPlacesModuleConfig,
  FeaturedPlacesModuleData,
} from '@/components/page-builder/modules/FeaturedPlacesModule'
import { withFeaturedPlacesSlot } from '@/lib/featured-places-load-queue'
import { categorySupportsLastMinuteTab } from '@/lib/last-minute-availability'
import { useEffect, useRef, useState } from 'react'

/** İstemci zaman aşımı — sunucu resilient 10s+10s bekleyebilir; UI sonsuza kilitlenmesin */
const FEATURED_FETCH_TIMEOUT_MS = 14_000

export default function DeferredFeaturedPlacesModule({
  config,
  locale = 'tr',
  /** Anasayfada ilk / oteller bloğu — Intersection beklemeden hemen yükle */
  priority = false,
}: {
  config: FeaturedPlacesModuleConfig
  locale?: string
  priority?: boolean
}) {
  const categorySlug = config.categorySlug ?? 'oteller'
  const anchorRef = useRef<HTMLDivElement>(null)
  const [shouldLoad, setShouldLoad] = useState(priority)
  const [data, setData] = useState<FeaturedPlacesModuleData | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (priority || shouldLoad) return
    const node = anchorRef.current
    if (!node) return
    if (typeof IntersectionObserver === 'undefined') {
      setShouldLoad(true)
      return
    }

    // 900px tüm blokları birden tetikliyordu → API fırtınası / feribot “takılı”
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return
        setShouldLoad(true)
        observer.disconnect()
      },
      { rootMargin: '280px 0px' },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [priority, shouldLoad])

  useEffect(() => {
    if (!shouldLoad || data || failed) return
    let cancelled = false
    const controller = new AbortController()
    const timeoutId = window.setTimeout(() => controller.abort(), FEATURED_FETCH_TIMEOUT_MS)
    // İlk boya: last_minute ağır otel sorgusunu ertele → önerilenler hızlı gelsin
    const query = new URLSearchParams({
      category: categorySlug,
      locale,
      include_last_minute: '0',
    })

    void withFeaturedPlacesSlot(
      async () => {
        if (cancelled) return
        try {
          const response = await fetch(`/api/homepage-featured?${query.toString()}`, {
            signal: controller.signal,
          })
          if (!response.ok) throw new Error(`homepage_featured_${response.status}`)
          const payload = (await response.json()) as { data?: FeaturedPlacesModuleData | null }
          if (cancelled) return
          if (payload.data) setData(payload.data)
          else setFailed(true)
        } catch (error: unknown) {
          if (cancelled) return
          if (error instanceof DOMException && error.name === 'AbortError') {
            setFailed(true)
            return
          }
          setFailed(true)
        }
      },
      { priority },
    )

    return () => {
      cancelled = true
      controller.abort()
      window.clearTimeout(timeoutId)
    }
  }, [categorySlug, data, failed, locale, priority, shouldLoad])

  // Son dakika sekmesi — önerilenler göründükten sonra arka planda doldur
  const lastMinuteTriedRef = useRef(false)
  useEffect(() => {
    if (!data || failed) return
    if (!categorySupportsLastMinuteTab(categorySlug)) return
    if ((data.lastMinuteListings?.length ?? 0) > 0) return
    if (lastMinuteTriedRef.current) return
    lastMinuteTriedRef.current = true

    let cancelled = false
    const controller = new AbortController()
    const query = new URLSearchParams({
      category: categorySlug,
      locale,
      include_last_minute: '1',
    })

    void withFeaturedPlacesSlot(async () => {
      if (cancelled) return
      try {
        const response = await fetch(`/api/homepage-featured?${query.toString()}`, {
          signal: controller.signal,
        })
        if (!response.ok || cancelled) return
        const payload = (await response.json()) as { data?: FeaturedPlacesModuleData | null }
        if (cancelled || !payload.data) return
        setData((prev) =>
          prev
            ? {
                ...prev,
                lastMinuteListings: payload.data!.lastMinuteListings,
                lastMinuteViewAllHref: payload.data!.lastMinuteViewAllHref,
                tabDefs: payload.data!.tabDefs,
              }
            : payload.data!,
        )
      } catch {
        /* sekme boş kalabilir — önerilenler zaten gösterildi */
      }
    })

    return () => {
      cancelled = true
      controller.abort()
    }
  }, [categorySlug, data, failed, locale])

  if (failed) return null

  return (
    <div ref={anchorRef}>
      {data ? (
        <SectionGridFeaturePlaces
          stayListings={data.listings}
          cardType={(config.cardType as 'card1' | 'card2') ?? 'card2'}
          heading={config.heading ?? data.heading}
          subHeading={config.subHeading ?? data.subHeading}
          tabDefs={data.tabDefs}
          tabListingIds={data.tabIds}
          lastMinuteListings={data.lastMinuteListings}
          lastMinuteViewAllHref={data.lastMinuteViewAllHref}
          categorySlug={data.categorySlug}
          maxCount={data.displayCount}
          rightButtonHref={config.viewAllHref ?? data.viewAllHref}
        />
      ) : (
        <div
          className="skeleton-delayed h-72 w-full rounded-2xl bg-neutral-100 dark:bg-neutral-800"
          aria-hidden
        />
      )}
    </div>
  )
}
