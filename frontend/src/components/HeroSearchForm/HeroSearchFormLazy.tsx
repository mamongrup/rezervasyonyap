'use client'

import clsx from 'clsx'
import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'
import type { ListingType } from '@/type'

/**
 * Masaüstü hero arama formu — yalnızca lg+ ekranlarda yükler.
 * Mobilde (PSI mobile crawl dahil) chunk yüklenmez: react-datepicker, headlessui
 * ve date-fns yığını yalnızca büyük ekranlarda indirilir → TBT sıfıra yaklaşır.
 */
const HeroSearchFormInner = dynamic(() => import('./HeroSearchForm'), {
  ssr: false,
  loading: () => (
    <div className="hero-search-form w-full min-w-0" aria-busy="true" aria-label="Yükleniyor">
      <div
        className={clsx(
          'h-14 w-full max-w-5xl animate-pulse rounded-full sm:h-[3.25rem]',
          'bg-neutral-200/90 dark:bg-neutral-700/80',
        )}
      />
    </div>
  ),
})

export default function HeroSearchFormLazy({
  initTab = 'Stays',
  locale = 'tr',
  hideVerticalTabs = false,
  categoryBarLayout = 'default',
}: {
  initTab?: ListingType
  locale?: string
  hideVerticalTabs?: boolean
  categoryBarLayout?: 'default' | 'spread'
}) {
  const [isDesktop, setIsDesktop] = useState(false)

  useEffect(() => {
    const mql = window.matchMedia('(min-width: 1024px)')
    const update = () => setIsDesktop(mql.matches)
    update()
    mql.addEventListener('change', update)
    return () => mql.removeEventListener('change', update)
  }, [])

  if (!isDesktop) {
    return <div className="hero-search-form w-full min-w-0" aria-hidden />
  }

  return (
    <HeroSearchFormInner
      initTab={initTab}
      locale={locale}
      hideVerticalTabs={hideVerticalTabs}
      categoryBarLayout={categoryBarLayout}
    />
  )
}
