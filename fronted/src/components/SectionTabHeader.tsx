'use client'

import { useVitrinHref } from '@/hooks/use-vitrin-href'
import { ViewAllPillLink } from '@/shared/ViewAllPillLink'
import Heading from '@/shared/Heading'
import T from '@/utils/getT'
import { Tab, TabGroup, TabList } from '@headlessui/react'
import { FC, ReactNode } from 'react'

interface Props {
  tabActive: string
  tabs: string[]
  heading: ReactNode
  subHeading?: string
  onChangeTab?: (item: string) => void
  rightButtonHref?: string
}

const SectionTabHeader: FC<Props> = ({
  tabActive,
  tabs,
  subHeading,
  heading,
  onChangeTab,
  rightButtonHref = '/oteller/all',
}) => {
  const vitrinHref = useVitrinHref()
  const resolvedRightHref = vitrinHref(rightButtonHref)
  return (
    <div className="relative flex flex-col">
      <Heading subheading={subHeading}>{heading}</Heading>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="max-w-full grow">
          <TabGroup
            defaultIndex={tabs.indexOf(tabActive)}
            onChange={(index) => onChangeTab && onChangeTab(tabs[index])}
            className="relative hidden-scrollbar flex w-full overflow-x-auto text-sm md:text-base"
          >
            <TabList className="flex sm:gap-x-1.5">
              {tabs.map((item, index) => (
                <Tab
                  key={index}
                  className="block rounded-full px-4 py-2.5 leading-none font-medium whitespace-nowrap focus-within:outline-hidden data-hover:bg-black/5 data-[selected]:bg-neutral-900 data-[selected]:text-white sm:px-6 sm:py-3 dark:data-hover:bg-white/5 dark:data-[selected]:bg-neutral-100 dark:data-[selected]:text-neutral-900"
                >
                  {item}
                </Tab>
              ))}
            </TabList>
          </TabGroup>
        </div>
        <ViewAllPillLink href={resolvedRightHref} className="ml-auto">
          {T['common']['View all']}
        </ViewAllPillLink>
      </div>
    </div>
  )
}

export default SectionTabHeader
