'use client'

import CarCard from '@/components/CarCard'
import ExperiencesCard from '@/components/ExperiencesCard'
import StayCard from '@/components/StayCard'
import type { TCarListing, TExperienceListing, TStayListing } from '@/data/listings'
import { mapPublicListingItemToListingBase } from '@/lib/listings-fetcher'
import { searchPublicListings } from '@/lib/travel-api'
import { normalizeCatalogVertical } from '@/lib/catalog-listing-vertical'
import { Tab, TabGroup, TabList } from '@headlessui/react'
import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'

const tabs = ['Stays', 'Experiences', 'Car Rentals'] as const

interface Props {
  onChangeTab?: (item: string) => void
}

const ListingTabs = ({ onChangeTab }: Props) => {
  const params = useParams()
  const locale = typeof params?.locale === 'string' ? params.locale : 'tr'

  const [stayListings, setStayListings] = useState<TStayListing[]>([])
  const [carListings, setCarListings] = useState<TCarListing[]>([])
  const [experienceListings, setExperienceListings] = useState<TExperienceListing[]>([])
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]>(tabs[0])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      if (activeTab === 'Stays' && stayListings.length === 0) {
        const res = await searchPublicListings({ categoryCode: 'hotel', perPage: 8, page: 1, locale })
        if (!cancelled && res?.listings?.length)
          setStayListings(res.listings.map(mapPublicListingItemToListingBase) as TStayListing[])
      } else if (activeTab === 'Car Rentals' && carListings.length === 0) {
        const res = await searchPublicListings({
          categoryCode: 'car_rental',
          perPage: 8,
          page: 1,
          locale,
        })
        if (!cancelled && res?.listings?.length)
          setCarListings(res.listings.map(mapPublicListingItemToListingBase) as TCarListing[])
      } else if (activeTab === 'Experiences' && experienceListings.length === 0) {
        const res = await searchPublicListings({ categoryCode: 'tour', perPage: 8, page: 1, locale })
        if (!cancelled && res?.listings?.length)
          setExperienceListings(res.listings.map(mapPublicListingItemToListingBase) as TExperienceListing[])
      }
    })()
    return () => {
      cancelled = true
    }
  }, [activeTab, locale, stayListings.length, carListings.length, experienceListings.length])

  const handleTabChange = async (index: number) => {
    onChangeTab && onChangeTab(tabs[index])
    setActiveTab(tabs[index])
  }

  return (
    <div className="w-full">
      <TabGroup
        onChange={handleTabChange}
        className="relative hidden-scrollbar flex w-full overflow-x-auto text-sm md:text-base"
      >
        <TabList className="flex sm:gap-x-1.5">
          {tabs.map((item, index) => (
            <Tab
              key={index}
              className="block rounded-full px-4 py-2.5 leading-none font-medium whitespace-nowrap focus-within:outline-hidden data-hover:bg-black/5 data-[selected]:bg-neutral-900 data-[selected]:text-white sm:px-6 sm:py-3 dark:data-[selected]:bg-neutral-100 dark:data-[selected]:text-neutral-900"
            >
              {item}
            </Tab>
          ))}
        </TabList>
      </TabGroup>

      <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 md:gap-7">
        {activeTab === 'Stays' &&
          stayListings.slice(0, 4).map((stay) => (
            <StayCard
              key={stay.id}
              data={{
                ...stay,
                listingVertical: normalizeCatalogVertical(stay.listingVertical),
              }}
            />
          ))}

        {activeTab === 'Car Rentals' && carListings.slice(0, 4).map((car) => <CarCard key={car.id} data={car} />)}

        {activeTab === 'Experiences' &&
          experienceListings.slice(0, 4).map((experience) => (
            <ExperiencesCard key={experience.id} data={experience} />
          ))}
      </div>
    </div>
  )
}

export default ListingTabs
