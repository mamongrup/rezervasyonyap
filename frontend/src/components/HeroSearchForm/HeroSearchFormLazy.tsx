'use client'

import clsx from 'clsx'
import dynamic from 'next/dynamic'

/**
 * Ana sayfa / bölge / kategori şablonlarında hero arama formu.
 * `react-datepicker`, `@headlessui/react` ve alt formlar ilk paketten ayrı chunk'ta yüklenir
 * → mobil PSI'de TBT ve ana iş parçacığı süresi düşer.
 */
export default dynamic(() => import('./HeroSearchForm'), {
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
