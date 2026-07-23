'use client'

import SectionSliderRegions, { type RegionSliderItem } from '@/components/SectionSliderRegions'
import type { RegionSliderModuleConfig } from '@/components/page-builder/modules/RegionSliderModule'
import { prefixLocale } from '@/lib/i18n-config'
import { regionsWithListings } from '@/lib/region-stats-display'
import HeadingWithSub from '@/shared/Heading'
import { useEffect, useRef, useState } from 'react'

/**
 * Anasayfa bölge slider — RSC stream'ini region-stats (eski SQL ~5 sn timeout)
 * bekletmesin diye görünür alana yaklaşınca istemcide yükler.
 */
export default function DeferredRegionSliderModule({
  config,
  locale = 'tr',
}: {
  config: RegionSliderModuleConfig
  locale?: string
}) {
  const categoryCode = config.categoryCode?.trim() ?? ''
  const limit = config.limit ?? 12
  const anchorRef = useRef<HTMLDivElement>(null)
  const [shouldLoad, setShouldLoad] = useState(false)
  const [regions, setRegions] = useState<RegionSliderItem[] | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    const node = anchorRef.current
    if (!node || shouldLoad) return
    if (typeof IntersectionObserver === 'undefined') {
      setShouldLoad(true)
      return
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return
        setShouldLoad(true)
        observer.disconnect()
      },
      { rootMargin: '900px 0px' },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [shouldLoad])

  useEffect(() => {
    if (!shouldLoad || regions || failed || !categoryCode) return
    const controller = new AbortController()
    const q = new URLSearchParams({
      category_code: categoryCode,
      limit: String(limit),
    })
    void fetch(`/api/v1/catalog/public/region-stats?${q}`, {
      signal: controller.signal,
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(`region_stats_${res.status}`)
        const data = (await res.json()) as { regions?: RegionSliderItem[] }
        const list = regionsWithListings(
          Array.isArray(data.regions)
            ? data.regions.map((r) => ({
                name: String(r.name ?? ''),
                slug: String(r.slug ?? ''),
                count: typeof r.count === 'number' ? r.count : 0,
                thumbnail: typeof r.thumbnail === 'string' ? r.thumbnail : '',
              }))
            : [],
        ).filter((r) => r.slug && r.name)
        setRegions(list)
        if (list.length === 0) setFailed(true)
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return
        setFailed(true)
      })
    const timeoutId = window.setTimeout(() => controller.abort(), 2800)
    return () => {
      window.clearTimeout(timeoutId)
      controller.abort()
    }
  }, [categoryCode, failed, limit, regions, shouldLoad])

  if (!categoryCode || failed) return null

  const categoryRouteRaw = config.categoryRoute?.trim()
  const resolvedRoute = categoryRouteRaw
    ? prefixLocale(locale, `/${categoryRouteRaw.replace(/^\/+/, '')}`)
    : prefixLocale(locale, '/location')

  return (
    <div ref={anchorRef}>
      {regions && regions.length > 0 ? (
        <div>
          {config.heading ? (
            <HeadingWithSub subheading={config.subheading}>{config.heading}</HeadingWithSub>
          ) : null}
          <div className="px-3 sm:px-5 xl:px-6">
            <SectionSliderRegions
              regions={regions}
              categoryRoute={resolvedRoute}
              unit={config.unit ?? 'ilan'}
              cardType={config.cardType ?? 'card3'}
            />
          </div>
        </div>
      ) : (
        <div
          className="skeleton-delayed h-56 w-full rounded-2xl bg-neutral-100 dark:bg-neutral-800"
          aria-hidden
        />
      )}
    </div>
  )
}
