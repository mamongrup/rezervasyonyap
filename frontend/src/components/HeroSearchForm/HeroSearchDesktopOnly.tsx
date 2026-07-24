'use client'

import type { ListingType } from '@/type'
import dynamic from 'next/dynamic'
import { HeroSearchFormHome } from './HeroSearchFormHome'
import { HeroSearchFormSkeleton } from './HeroSearchFormSkeleton'
import type { StaySearchPrefill } from './StaySearchForm'

/** Dikey tab’lı form (nadir): Headless UI + sekme panelleri — ayrı chunk */
const HeroSearchFormWithTabs = dynamic(() => import('./HeroSearchForm'), {
  ssr: false,
  loading: () => <HeroSearchFormSkeleton />,
})

/**
 * `HeroSectionWithSearchForm1` (`topSpacing="minimal"`) hero aramasını `hidden lg:block`
 * ile gizler (`ApplicationLayout` üst arama çubuğu da `lg` altında).
 *
 * JS matchMedia kapısı yok: `useEffect` sonrası `null` → skeleton → form zinciri
 * masaüstünde kısa “takılma” yapıyordu. Görünürlük CSS’te; ana sayfa / oteller
 * `hideVerticalTabs` ile `HeroSearchFormHome`’u senkron yükler (iskelet yok).
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
  if (hideVerticalTabs) {
    return (
      <HeroSearchFormHome
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
