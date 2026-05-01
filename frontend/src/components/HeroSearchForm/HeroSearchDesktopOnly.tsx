'use client'

import type { ListingType } from '@/type'
import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'
import { HeroSearchFormSkeleton } from './HeroSearchFormSkeleton'

const HeroSearchForm = dynamic(() => import('./HeroSearchForm'), {
  ssr: false,
  loading: () => <HeroSearchFormSkeleton />,
})

/**
 * `HeroSectionWithSearchForm1` (`topSpacing="minimal"`) hero aramasını mobilde `hidden md:block`
 * ile gizler. Formu child olarak geçirmek mobilde chunk'ı yine keşfettirdiği için burada
 * yalnızca `md` ve üzeri görünümde dinamik import ediyoruz.
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

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)')
    const sync = () => setShow(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  if (!show) return null
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
