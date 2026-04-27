'use client'

import { verticalNavLabel } from '@/lib/vertical-nav-i18n'
import { ListingType } from '@/type'
import { TabGroup, TabList, Tab, TabPanels, TabPanel } from '@headlessui/react'
import { HugeiconsIcon } from '@hugeicons/react'
import clsx from 'clsx'
import { Fragment } from 'react'
import { formTabs } from './HeroSearchFormTabs'

const HeroSearchFormSmall = ({
  className,
  initTab = 'Stays',
  locale = 'tr',
}: {
  className?: string
  initTab: ListingType
  locale?: string
}) => {
  return (
    <TabGroup
      defaultIndex={formTabs.findIndex((tab) => tab.name === initTab)}
      className={clsx('hero-search-form-sm', className)}
    >
      <TabList className="flex h-20 justify-center gap-x-10">
        {formTabs.map((tab) => {
          return (
            <Tab
              key={tab.name}
              as="div"
              className={clsx(
                'group relative -mx-3 flex shrink-0 cursor-pointer items-center justify-center px-3 text-neutral-400 hover:text-black focus-visible:outline-hidden data-[selected]:text-neutral-950 dark:hover:text-white dark:data-[selected]:text-neutral-100'
              )}
            >
              <div className="relative">
                <span className="sr-only">{verticalNavLabel(locale, tab.name)}</span>
                <HugeiconsIcon icon={tab.icon} size={28} />
                <span className="absolute top-full me-2 mt-1 hidden h-0.5 w-full rounded-full bg-neutral-800 group-data-[selected]:block dark:bg-neutral-100" />
              </div>
            </Tab>
          )
        })}
      </TabList>

      <TabPanels className="mt-2">
        {formTabs.map((tab) => (
          <TabPanel as={Fragment} key={tab.name}>
            <tab.formComponent formStyle={'small'} />
          </TabPanel>
        ))}
      </TabPanels>
    </TabGroup>
  )
}

export default HeroSearchFormSmall
