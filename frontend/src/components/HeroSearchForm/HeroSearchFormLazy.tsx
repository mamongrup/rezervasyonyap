'use client'

import clsx from 'clsx'
import dynamic from 'next/dynamic'

/**
 * Ana sayfa / bölge / kategori şablonlarında hero arama formu.
 * `react-datepicker`, `@headlessui/react` ve alt formlar ilk paketten ayrı chunk’ta yüklenir
 * → mobil PSI’de TBT ve ana iş parçacığı süresi düşer.
 */
/** `ssr: false` yalnızca istemci chunk’ı yüklendiğinde formu gösterir; chunk/CSS hatasında arama kaybolur. */
export default dynamic(() => import('./HeroSearchForm'), {
  ssr: true,
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
