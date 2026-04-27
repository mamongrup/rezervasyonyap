'use client'

import { ListingType } from '@/type'
import clsx from 'clsx'
import { HeroMenuCategoryBar } from './HeroMenuCategoryBar'
import { formTabs } from './HeroSearchFormTabs'

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
}: {
  className?: string
  initTab: ListingType
  locale?: string
  categoryBarLayout?: 'default' | 'spread'
  activeSlugs?: string[]
}) {
  const tab = formTabs.find((t) => t.name === initTab) ?? formTabs[0]
  const FormComponent = tab.formComponent

  return (
    <div className={clsx('hero-search-form w-full min-w-0', className)}>
      <HeroMenuCategoryBar locale={locale} layout={categoryBarLayout} activeSlugs={activeSlugs} />
      <FormComponent formStyle="default" />
    </div>
  )
}
