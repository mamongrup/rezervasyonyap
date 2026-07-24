'use client'

import type { ListingType } from '@/type'
import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'
import { HeroSearchFormSkeleton } from './HeroSearchFormSkeleton'
import type { StaySearchPrefill } from './StaySearchForm'

/**
 * Masaüstü hero arama — mobilde hiç hydrate etme (PSI unused JS / TBT).
 * Görünürlük hâlâ CSS `hidden lg:block`; JS chunk yalnız lg+ viewport’ta iner.
 *
 * Not: Eski matchMedia→null→skeleton zinciri masaüstünde kısa takılma yapıyordu;
 * burada iskelet yalnız chunk indirme anında, form chunk’ı lg+ için dynamic.
 */
const HeroSearchFormHomeDynamic = dynamic(
  () => import('./HeroSearchFormHome').then((m) => m.HeroSearchFormHome),
  { ssr: false, loading: () => <HeroSearchFormSkeleton /> },
)

const HeroSearchFormWithTabs = dynamic(() => import('./HeroSearchForm'), {
  ssr: false,
  loading: () => <HeroSearchFormSkeleton />,
})

export default function HeroSearchDesktopOnly({
  initTab = 'Stays',
  locale = 'tr',
  hideVerticalTabs = false,
  categoryBarLayout = 'default',
  activeSlugs,
  collapseOverflowAfterSlug,
  staySearchTargetPath,
  staySearchPrefill,
}: {
  initTab?: ListingType
  locale?: string
  hideVerticalTabs?: boolean
  categoryBarLayout?: 'default' | 'spread'
  activeSlugs?: string[]
  collapseOverflowAfterSlug?: string
  staySearchTargetPath?: string
  staySearchPrefill?: StaySearchPrefill
}) {
  const [isLg, setIsLg] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)')
    const apply = () => setIsLg(mq.matches)
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [])

  if (!isLg) return null

  if (hideVerticalTabs) {
    return (
      <HeroSearchFormHomeDynamic
        initTab={initTab}
        locale={locale}
        categoryBarLayout={categoryBarLayout}
        activeSlugs={activeSlugs}
        collapseOverflowAfterSlug={collapseOverflowAfterSlug}
        staySearchTargetPath={staySearchTargetPath}
        staySearchPrefill={staySearchPrefill}
      />
    )
  }

  return (
    <HeroSearchFormWithTabs
      initTab={initTab}
      locale={locale}
      hideVerticalTabs={false}
      categoryBarLayout={categoryBarLayout}
      activeSlugs={activeSlugs}
      collapseOverflowAfterSlug={collapseOverflowAfterSlug}
      staySearchTargetPath={staySearchTargetPath}
      staySearchPrefill={staySearchPrefill}
    />
  )
}
