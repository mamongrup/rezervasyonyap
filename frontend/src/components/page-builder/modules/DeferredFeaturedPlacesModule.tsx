'use client'

import SectionGridFeaturePlaces from '@/components/SectionGridFeaturePlaces'
import type {
  FeaturedPlacesModuleConfig,
  FeaturedPlacesModuleData,
} from '@/components/page-builder/modules/FeaturedPlacesModule'
import { withFeaturedPlacesSlot } from '@/lib/featured-places-load-queue'
import { useEffect, useRef, useState } from 'react'

/** İstemci zaman aşımı — sunucu resilient 10s+10s bekleyebilir; UI sonsuza kilitlenmesin */
const FEATURED_FETCH_TIMEOUT_MS = 12_000

export default function DeferredFeaturedPlacesModule({
  config,
  locale = 'tr',
}: {
  config: FeaturedPlacesModuleConfig
  locale?: string
}) {
  const categorySlug = config.categorySlug ?? 'oteller'
  const anchorRef = useRef<HTMLDivElement>(null)
  const [shouldLoad, setShouldLoad] = useState(false)
  const [data, setData] = useState<FeaturedPlacesModuleData | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    const node = anchorRef.current
    if (!node || shouldLoad) return
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
  }, [shouldLoad])

  useEffect(() => {
    if (!shouldLoad || data || failed) return
    let cancelled = false
    const controller = new AbortController()
    const timeoutId = window.setTimeout(() => controller.abort(), FEATURED_FETCH_TIMEOUT_MS)
    const query = new URLSearchParams({ category: categorySlug, locale })

    void withFeaturedPlacesSlot(async () => {
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
    })

    return () => {
      cancelled = true
      controller.abort()
      window.clearTimeout(timeoutId)
    }
  }, [categorySlug, data, failed, locale, shouldLoad])

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
