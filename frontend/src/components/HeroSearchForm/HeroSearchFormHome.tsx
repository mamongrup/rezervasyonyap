'use client'

import { ListingType } from '@/type'
import clsx from 'clsx'
import { Suspense } from 'react'
import { HeroMenuCategoryBar } from './HeroMenuCategoryBar'
import { formTabs } from './HeroSearchFormTabs'
import { StaySearchForm, type StaySearchPrefill } from './StaySearchForm'

/**
 * `hideVerticalTabs` yolu: Headless UI yok; ana sayfa / bölge / kategori hero’da
 * PSI’de “kullanılmayan JS” olarak sayılan @headlessui/react bu chunk’a girmez.
 */
export function HeroSearchFormHome({
  className,
  initTab = 'Stays',
  locale = 'tr',
  categoryBarLayout = 'default',
  activeSlugs,
  collapseOverflowAfterSlug,
  staySearchTargetPath,
  staySearchPrefill,
}: {
  className?: string
  initTab: ListingType
  locale?: string
  categoryBarLayout?: 'default' | 'spread'
  activeSlugs?: string[]
  /** Örn. ana sayfa: `arac-kiralama` sonrası kalan kayıtlı kategoriler hamburger menüde */
  collapseOverflowAfterSlug?: string
  staySearchTargetPath?: string
  staySearchPrefill?: StaySearchPrefill
}) {
  const tab = formTabs.find((t) => t.name === initTab) ?? formTabs[0]
  const FormComponent = initTab === 'Stays' ? StaySearchForm : tab.formComponent

  return (
    <div className={clsx('hero-search-form relative z-50 w-full min-w-0 overflow-visible', className)}>
      <HeroMenuCategoryBar
        locale={locale}
        layout={categoryBarLayout}
        activeSlugs={activeSlugs}
        collapseOverflowAfterSlug={collapseOverflowAfterSlug}
      />
      {initTab === 'Stays' ? (
        <Suspense
          fallback={
            <div
              className="h-20 w-full animate-pulse rounded-full bg-neutral-100 dark:bg-neutral-800"
              aria-busy="true"
            />
          }
        >
          <StaySearchForm
            formStyle="default"
            searchTargetPath={staySearchTargetPath}
            searchPrefill={staySearchPrefill}
          />
        </Suspense>
      ) : (
        <FormComponent formStyle="default" />
      )}
    </div>
  )
}
