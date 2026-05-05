'use client'

import { ListingType } from '@/type'
import clsx from 'clsx'
import { HeroMenuCategoryBar } from './HeroMenuCategoryBar'
import { formTabs } from './HeroSearchFormTabs'
import { StaySearchForm } from './StaySearchForm'

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
}: {
  className?: string
  initTab: ListingType
  locale?: string
  categoryBarLayout?: 'default' | 'spread'
  activeSlugs?: string[]
  /** Örn. ana sayfa: `arac-kiralama` sonrası kalan kayıtlı kategoriler hamburger menüde */
  collapseOverflowAfterSlug?: string
}) {
  const tab = formTabs.find((t) => t.name === initTab) ?? formTabs[0]
  const FormComponent = initTab === 'Stays' ? StaySearchForm : tab.formComponent

  return (
    <div className={clsx('hero-search-form w-full min-w-0', className)}>
      <HeroMenuCategoryBar
        locale={locale}
        layout={categoryBarLayout}
        activeSlugs={activeSlugs}
        collapseOverflowAfterSlug={collapseOverflowAfterSlug}
      />
      <FormComponent formStyle="default" />
    </div>
  )
}
