'use client'

import clsx from 'clsx'
import dynamic from 'next/dynamic'
import { useEffect, useState, type ComponentProps } from 'react'

/**
 * Ana sayfa / bölge / kategori şablonlarında hero arama formu.
 * `react-datepicker`, `@headlessui/react` ve alt formlar ilk paketten ayrı chunk'ta yüklenir
 * → mobil PSI'de TBT ve ana iş parçacığı süresi düşer.
 */
const HeroSearchFormDynamic = dynamic(() => import('./HeroSearchForm'), {
  ssr: false,
  loading: () => (
    <div className="hero-search-form w-full min-w-0" aria-busy="true" aria-label="Yükleniyor">
      {/* Kategori bar iskeleti — HeroMenuCategoryBar yüksekliğiyle eşleşir */}
      <div className="mb-3 flex gap-x-4 sm:mb-4 sm:gap-x-6">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="flex flex-col items-center gap-1.5">
            <div className={clsx('size-10 animate-pulse rounded-full sm:size-11', 'bg-neutral-200/90 dark:bg-neutral-700/80')} />
            <div className={clsx('h-3 w-7 animate-pulse rounded', 'bg-neutral-200/90 dark:bg-neutral-700/80')} />
          </div>
        ))}
      </div>
      {/* Arama hapi iskeleti — StaySearchForm yüksekliğiyle eşleşir */}
      <div className={clsx('h-20 w-full animate-pulse rounded-full', 'bg-neutral-200/90 dark:bg-neutral-700/80')} />
    </div>
  ),
})

type IdleWindow = Window & {
  requestIdleCallback?: (callback: IdleRequestCallback, opts?: IdleRequestOptions) => number
  cancelIdleCallback?: (id: number) => void
}

/**
 * Hero form bundle (datepicker/headless vb.) ilk boyamada ana thread'i zorluyor.
 * UI iskeletini anında gösterip gerçek formu idle dönemde mount ederek TBT/CPU baskısını düşürüyoruz.
 */
export default function HeroSearchFormLazy(props: ComponentProps<typeof HeroSearchFormDynamic>) {
  const [enabled, setEnabled] = useState(false)

  useEffect(() => {
    const w = window as IdleWindow
    let idleId: number | null = null
    const timeoutId = window.setTimeout(() => setEnabled(true), 1400)

    if (typeof w.requestIdleCallback === 'function') {
      idleId = w.requestIdleCallback(
        () => {
          window.clearTimeout(timeoutId)
          setEnabled(true)
        },
        { timeout: 1800 },
      )
    }

    return () => {
      window.clearTimeout(timeoutId)
      if (idleId != null && typeof w.cancelIdleCallback === 'function') {
        w.cancelIdleCallback(idleId)
      }
    }
  }, [])

  if (!enabled) {
    return (
      <div className="hero-search-form w-full min-w-0" aria-busy="true" aria-label="Yükleniyor">
        <div className="mb-3 flex gap-x-4 sm:mb-4 sm:gap-x-6">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="flex flex-col items-center gap-1.5">
              <div className={clsx('size-10 animate-pulse rounded-full sm:size-11', 'bg-neutral-200/90 dark:bg-neutral-700/80')} />
              <div className={clsx('h-3 w-7 animate-pulse rounded', 'bg-neutral-200/90 dark:bg-neutral-700/80')} />
            </div>
          ))}
        </div>
        <div className={clsx('h-20 w-full animate-pulse rounded-full', 'bg-neutral-200/90 dark:bg-neutral-700/80')} />
      </div>
    )
  }

  return <HeroSearchFormDynamic {...props} />
}
