'use client'

import { Link } from '@/shared/link'
import { ListingType } from '@/type'
import * as Headless from '@headlessui/react'
import {
  Airplane02Icon,
  Car05Icon,
  HotAirBalloonFreeIcons,
  House03Icon,
} from '@hugeicons/core-free-icons'
import { IconSvgElement } from '@hugeicons/react'
import clsx from 'clsx'
import { Fragment } from 'react'
import { ExperiencesSearchForm } from './ExperiencesSearchForm'
import { FlightSearchForm } from './FlightSearchForm'
import { verticalNavLabel } from '@/lib/vertical-nav-i18n'
import { RentalCarSearchForm } from './RentalCarSearchForm'
import { StaySearchForm } from './StaySearchForm'
import { HeroMenuCategoryBar } from './HeroMenuCategoryBar'

export const formTabs: {
  name: ListingType
  icon: IconSvgElement
  href: string
  formComponent: React.ComponentType<{ formStyle: 'default' | 'small' }>
}[] = [
  { name: 'Stays', icon: House03Icon, href: '/', formComponent: StaySearchForm },
  { name: 'Cars', icon: Car05Icon, href: '/car', formComponent: RentalCarSearchForm },
  { name: 'Experiences', icon: HotAirBalloonFreeIcons, href: '/experience', formComponent: ExperiencesSearchForm },
  { name: 'Flights', icon: Airplane02Icon, href: '/ucak-bileti/all', formComponent: FlightSearchForm },
]

const HeroSearchForm = ({
  className,
  initTab = 'Stays',
  locale = 'tr',
  /** API `hero_search` menüsü ile kategori şeridi; true iken dikey Stays/Cars şeridi gizlenir */
  hideVerticalTabs = false,
  /** Bölge hero: ikon şeridi tam genişlikte yayılı */
  categoryBarLayout = 'default',
}: {
  className?: string
  initTab: ListingType
  /** `[locale]` — sekme etiketleri TR/EN */
  locale?: string
  hideVerticalTabs?: boolean
  categoryBarLayout?: 'default' | 'spread'
}) => {
  return (
    <div className={clsx('hero-search-form w-full min-w-0', className)}>
      {hideVerticalTabs ? (
        <HeroMenuCategoryBar locale={locale} layout={categoryBarLayout} />
      ) : (
        <Headless.TabGroup defaultIndex={formTabs.findIndex((tab) => tab.name === initTab)}>
          {/* Chisfis: ms-3 mb-8 sm:gap-x-6 xl:ms-10 xl:gap-x-10 */}
          <Headless.TabList className="ms-3 mb-8 flex flex-wrap gap-x-5 gap-y-1 sm:gap-x-6 xl:ms-10 xl:gap-x-10">
            {formTabs.map((tab) => {
              return (
                <Headless.Tab
                  key={tab.name}
                  as={Link}
                  href={tab.href}
                  className="group/tab flex shrink-0 cursor-pointer items-center text-sm font-medium text-neutral-500 transition-colors hover:text-neutral-700 focus-visible:outline-hidden data-[selected]:font-semibold data-[selected]:text-neutral-950 lg:text-base dark:text-neutral-500 dark:hover:text-neutral-400 dark:data-[selected]:text-neutral-100"
                >
                  <div className="me-1.5 hidden size-2.5 rounded-full bg-neutral-950 group-data-[selected]/tab:block xl:me-2 dark:bg-neutral-100" />
                  <span>{verticalNavLabel(locale, tab.name)}</span>
                </Headless.Tab>
              )
            })}
          </Headless.TabList>
        </Headless.TabGroup>
      )}
      {formTabs.map((tab) =>
        tab.name === initTab ? (
          <Fragment key={tab.name}>
            <tab.formComponent formStyle={'default'} />
          </Fragment>
        ) : null
      )}
    </div>
  )
}

export default HeroSearchForm
