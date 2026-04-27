'use client'

import clsx from 'clsx'

/** Az node: eski 5×(daire+çizgi) iskeleti ~11 öğe → 3 öğe; PSI DOM boyutu için */
export function HeroSearchFormSkeleton() {
  return (
    <div className="hero-search-form w-full min-w-0" aria-busy="true" aria-label="Yükleniyor">
      <div
        className={clsx(
          'mb-3 h-[3.25rem] w-full animate-pulse rounded-2xl sm:h-14',
          'bg-neutral-200/90 dark:bg-neutral-700/80',
        )}
      />
      <div
        className={clsx('h-20 w-full animate-pulse rounded-full', 'bg-neutral-200/90 dark:bg-neutral-700/80')}
      />
    </div>
  )
}
