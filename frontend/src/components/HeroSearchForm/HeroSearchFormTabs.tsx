'use client'

import { ListingType } from '@/type'
import {
  Airplane02Icon,
  Car05Icon,
  HotAirBalloonFreeIcons,
  House03Icon,
} from '@hugeicons/core-free-icons'
import type { IconSvgElement } from '@hugeicons/react'
import dynamic from 'next/dynamic'
import type { ComponentType } from 'react'

/** Konaklama formu ağır (Headless Combobox, tarih/misafir alanları); sync import tümünü tek chunk’ta toplayıp TBT’yi şişirir. */
const StaySearchFormLazy = dynamic(
  () => import('./StaySearchForm').then((m) => m.StaySearchForm),
  {
    loading: () => (
      <div
        className="relative z-10 flex h-20 w-full animate-pulse rounded-full bg-neutral-200/90 dark:bg-neutral-700/80"
        aria-busy="true"
        aria-label="Yükleniyor"
      />
    ),
  },
)

const RentalCarSearchFormLazy = dynamic(
  () => import('./RentalCarSearchForm').then((m) => m.RentalCarSearchForm),
)
const ExperiencesSearchFormLazy = dynamic(
  () => import('./ExperiencesSearchForm').then((m) => m.ExperiencesSearchForm),
)
const FlightSearchFormLazy = dynamic(
  () => import('./FlightSearchForm').then((m) => m.FlightSearchForm),
)

export const formTabs: {
  name: ListingType
  icon: IconSvgElement
  href: string
  formComponent: ComponentType<{ formStyle: 'default' | 'small' }>
}[] = [
  { name: 'Stays', icon: House03Icon, href: '/', formComponent: StaySearchFormLazy },
  { name: 'Cars', icon: Car05Icon, href: '/car', formComponent: RentalCarSearchFormLazy },
  {
    name: 'Experiences',
    icon: HotAirBalloonFreeIcons,
    href: '/experience',
    formComponent: ExperiencesSearchFormLazy,
  },
  { name: 'Flights', icon: Airplane02Icon, href: '/ucak-bileti/all', formComponent: FlightSearchFormLazy },
]
