'use client'

import { verticalNavLabel } from '@/lib/vertical-nav-i18n'
import { Link } from '@/shared/link'
import { ListingType } from '@/type'
import { TabGroup, TabList, Tab } from '@headlessui/react'
import clsx from 'clsx'
import { Fragment } from 'react'
import { formTabs } from './HeroSearchFormTabs'

export default function HeroSearchFormWithVerticalTabs({
  className,
  initTab = 'Stays',
  locale = 'tr',
}: {
  className?: string
  initTab: ListingType
  locale?: string
  /** Dikey sekmeli modda kullanılmıyor; imza `HeroSearchForm` ile uyumlu */
  categoryBarLayout?: 'default' | 'spread'
  activeSlugs?: string[]
}) {
  return (
    <div className={clsx('hero-search-form w-full min-w-0', className)}>
      <TabGroup defaultIndex={formTabs.findIndex((tab) => tab.name === initTab)}>
        {/* Chisfis: ms-3 mb-8 sm:gap-x-6 xl:ms-10 xl:gap-x-10 */}
        <TabList className="ms-3 mb-8 flex flex-wrap gap-x-5 gap-y-1 sm:gap-x-6 xl:ms-10 xl:gap-x-10">
          {formTabs.map((tab) => {
            return (
              <Tab
                key={tab.name}
                as={Link}
                href={tab.href}
                className="group/tab flex shrink-0 cursor-pointer items-center text-sm font-medium text-neutral-500 transition-colors hover:text-neutral-700 focus-visible:outline-hidden data-[selected]:font-semibold data-[selected]:text-neutral-950 lg:text-base dark:text-neutral-500 dark:hover:text-neutral-400 dark:data-[selected]:text-neutral-100"
              >
                <div className="me-1.5 hidden size-2.5 rounded-full bg-neutral-950 group-data-[selected]/tab:block xl:me-2 dark:bg-neutral-100" />
                <span>{verticalNavLabel(locale, tab.name)}</span>
              </Tab>
            )
          })}
        </TabList>
      </TabGroup>
      {formTabs.map((tab) =>
        tab.name === initTab ? (
          <Fragment key={tab.name}>
            <tab.formComponent formStyle={'default'} />
          </Fragment>
        ) : null,
      )}
    </div>
  )
}
