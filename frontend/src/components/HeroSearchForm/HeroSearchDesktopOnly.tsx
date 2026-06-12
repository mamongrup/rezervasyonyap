'use client'

import type { ListingType } from '@/type'
import { useLayoutEffect, useState } from 'react'
import HeroSearchForm from './HeroSearchForm'
import { HeroSearchFormSkeleton } from './HeroSearchFormSkeleton'
import type { StaySearchPrefill } from './StaySearchForm'

/**
 * `HeroSectionWithSearchForm1` (`topSpacing="minimal"`) hero aramasını `hidden lg:block`
 * ile gizler (`ApplicationLayout` üst arama çubuğu da `lg` altında).
 * İlk dinamik katman kaldırıldı; sadece iç form panelleri lazy kalır.
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
  // Desktop ana sayfada formun ilk boyamada skeleton olarak kalmasını önle.
  // Bu bileşenin üst sarmalayıcısı <lg'de zaten `hidden`, effect mobilde kapatır.
  const [show, setShow] = useState(true)

  useLayoutEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)')
    const sync = () => setShow(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  /**
   * `show === false` iken `null` dönmek hero’da boş alan + “form yok” algısını uzatıyor.
   * Üst sarmalayıcı zaten `hidden lg:block`; mobilde iskelet DOM’da olsa da görünmez.
   */
  if (!show) {
    return <HeroSearchFormSkeleton />
  }
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
