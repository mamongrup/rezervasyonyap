'use client'

import { ListingType } from '@/type'
import dynamic from 'next/dynamic'
import { HeroSearchFormHome } from './HeroSearchFormHome'

const HeroSearchFormWithVerticalTabs = dynamic(() => import('./HeroSearchFormWithVerticalTabs'))

const HeroSearchForm = ({
  className,
  initTab = 'Stays',
  locale = 'tr',
  /** API `hero_search` menüsü ile kategori şeridi; true iken dikey Stays/Cars şeridi gizlenir */
  hideVerticalTabs = false,
  /** Bölge hero: ikon şeridi tam genişlikte yayılı */
  categoryBarLayout = 'default',
  /** Server component'ten pre-fetch edilen aktif hero slug listesi */
  activeSlugs,
}: {
  className?: string
  initTab: ListingType
  /** `[locale]` — sekme etiketleri TR/EN */
  locale?: string
  hideVerticalTabs?: boolean
  categoryBarLayout?: 'default' | 'spread'
  activeSlugs?: string[]
}) => {
  if (hideVerticalTabs) {
    return (
      <HeroSearchFormHome
        className={className}
        initTab={initTab}
        locale={locale}
        categoryBarLayout={categoryBarLayout}
        activeSlugs={activeSlugs}
      />
    )
  }
  return (
    <HeroSearchFormWithVerticalTabs
      className={className}
      initTab={initTab}
      locale={locale}
      categoryBarLayout={categoryBarLayout}
      activeSlugs={activeSlugs}
    />
  )
}

export default HeroSearchForm

export { formTabs } from './HeroSearchFormTabs'
