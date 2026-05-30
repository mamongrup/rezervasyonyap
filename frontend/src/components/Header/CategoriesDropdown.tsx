import type { CatalogMenuResolvedItem } from '@/types/catalog-menu'
import { getMessages } from '@/utils/getT'
import {
  Airplane02Icon,
  AnchorIcon,
  Building03Icon,
  Bus01Icon,
  Car05Icon,
  Compass01Icon,
  Home01Icon,
  FerryBoatIcon,
  HotAirBalloonFreeIcons,
  LegalDocument01Icon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/react'
import Link from 'next/link'

type Props = {
  /** `href` değerleri üst bileşende `vitrinHref` ile çözümlenmiş olmalı */
  items: CatalogMenuResolvedItem[]
  homeHref: string
  locale: string
}

const ICONS: Record<string, IconSvgElement> = {
  house: Building03Icon,
  home: Home01Icon,
  anchor: AnchorIcon,
  car: Car05Icon,
  hot_air_balloon: HotAirBalloonFreeIcons,
  boat: FerryBoatIcon,
  compass: Compass01Icon,
  airplane: Airplane02Icon,
  map_pinpoint: LegalDocument01Icon,
  bus: Bus01Icon,
}

export default function CategoriesDropdown({ items, homeHref, locale }: Props) {
  const m = getMessages(locale)
  const nav = m.navMenus?.catalogMenu
  if (!nav) return null

  return (
    <div className="group relative">
      <button
        type="button"
        className="-m-2.5 flex items-center p-2.5 text-sm font-medium text-neutral-700 group-hover:text-neutral-950 focus:outline-hidden dark:text-neutral-300 dark:group-hover:text-neutral-100"
      >
        {nav.buttonLabel}
        <svg
          className="ms-1 size-4 transition-transform group-hover:rotate-180 group-focus-within:rotate-180"
          viewBox="0 0 20 20"
          fill="none"
          aria-hidden="true"
        >
          <path d="M5 7.5 10 12.5l5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <div
        className="pointer-events-none absolute start-0 top-full z-40 mt-4 w-[560px] translate-y-1 overflow-hidden rounded-3xl opacity-0 shadow-lg ring-1 ring-black/5 transition duration-150 ease-out group-hover:pointer-events-auto group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:translate-y-0 group-focus-within:opacity-100 sm:px-0 dark:ring-white/10"
      >
        <div>
          <div className="relative grid grid-cols-2 gap-4 bg-white p-6 dark:bg-neutral-800">
            {items.map((item) => {
              const desc = item?.description ?? ''
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  className="focus-visible:ring-opacity-50 -m-3 flex items-center rounded-lg p-2 hover:bg-neutral-50 focus:outline-none focus-visible:ring focus-visible:ring-orange-500 dark:hover:bg-neutral-700"
                >
                  <div className="flex size-10 flex-shrink-0 items-center justify-center rounded-md bg-neutral-50 text-primary-500 sm:h-12 sm:w-12 dark:bg-neutral-700 dark:text-primary-200">
                    <HugeiconsIcon
                      icon={ICONS[item.icon] ?? Building03Icon}
                      size={22}
                      color="currentColor"
                      strokeWidth={1.6}
                      aria-hidden="true"
                    />
                  </div>
                  <div className="ms-4 space-y-0.5">
                    <p className="text-sm font-medium">{item.title}</p>
                    <p className="line-clamp-1 text-xs text-neutral-500 dark:text-neutral-300">{desc}</p>
                  </div>
                </Link>
              )
            })}
          </div>
          <div className="bg-neutral-50 p-4 dark:bg-neutral-700">
            <Link
              href={homeHref}
              className="focus-visible:ring-opacity-50 flow-root space-y-0.5 rounded-md px-2 py-2 focus:outline-none focus-visible:ring focus-visible:ring-orange-500"
            >
              <span className="flex items-center">
                <span className="text-sm font-medium">{nav.footerDoc}</span>
              </span>
              <span className="line-clamp-1 text-sm text-gray-500 dark:text-neutral-400">{nav.footerDescription}</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
