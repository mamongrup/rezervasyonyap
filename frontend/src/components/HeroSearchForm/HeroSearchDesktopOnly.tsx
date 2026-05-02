'use client'

import type { ListingType } from '@/type'
import dynamic from 'next/dynamic'
import { useLayoutEffect, useState } from 'react'
import { HeroSearchFormSkeleton } from './HeroSearchFormSkeleton'

const HeroSearchForm = dynamic(() => import('./HeroSearchForm'), {
  ssr: false,
  loading: () => <HeroSearchFormSkeleton />,
})

/**
 * `HeroSectionWithSearchForm1` (`topSpacing="minimal"`) hero aramasını `hidden lg:block`
 * ile gizler (`ApplicationLayout` üst arama çubuğu da `lg` altında).
 * Chunk'ı yalnızca bu genişlikte yüklüyoruz.
 */
export default function HeroSearchDesktopOnly({
  initTab = 'Stays',
  locale = 'tr',
  hideVerticalTabs = false,
  categoryBarLayout = 'default',
  activeSlugs,
}: {
  initTab?: ListingType
  locale?: string
  hideVerticalTabs?: boolean
  categoryBarLayout?: 'default' | 'spread'
  activeSlugs?: string[]
}) {
  const [show, setShow] = useState(false)

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
    />
  )
}
