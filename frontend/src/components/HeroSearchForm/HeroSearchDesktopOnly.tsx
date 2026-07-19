'use client'

import type { ListingType } from '@/type'
import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'
import { HeroSearchFormSkeleton } from './HeroSearchFormSkeleton'
import type { StaySearchPrefill } from './StaySearchForm'

const HeroSearchForm = dynamic(() => import('./HeroSearchForm'), {
  ssr: false,
  loading: () => <HeroSearchFormSkeleton />,
})

/**
 * `HeroSectionWithSearchForm1` (`topSpacing="minimal"`) hero aramasını `hidden lg:block`
 * ile gizler (`ApplicationLayout` üst arama çubuğu da `lg` altında).
 *
 * Eski `useLayoutEffect` + matchMedia: mount’ta senkron setState → PSI forced reflow.
 * Görünürlük zaten CSS ile kontrol edildiği için JS breakpoint’e gerek yok.
 */
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
  const [isDesktop, setIsDesktop] = useState(false)

  useEffect(() => {
    const query = window.matchMedia('(min-width: 1024px)')
    const sync = () => setIsDesktop(query.matches)
    sync()
    query.addEventListener('change', sync)
    return () => query.removeEventListener('change', sync)
  }, [])

  if (!isDesktop) return null

  return (
    <HeroSearchForm
      initTab={initTab}
      locale={locale}
      hideVerticalTabs={hideVerticalTabs}
      categoryBarLayout={categoryBarLayout}
      activeSlugs={activeSlugs}
      collapseOverflowAfterSlug={collapseOverflowAfterSlug}
      staySearchTargetPath={staySearchTargetPath}
      staySearchPrefill={staySearchPrefill}
    />
  )
}
