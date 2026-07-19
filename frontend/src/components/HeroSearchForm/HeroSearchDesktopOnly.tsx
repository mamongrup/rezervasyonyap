'use client'

import type { ListingType } from '@/type'
import HeroSearchForm from './HeroSearchForm'
import type { StaySearchPrefill } from './StaySearchForm'

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
