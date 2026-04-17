'use client'

import { defaultLocale, normalizeHrefForLocale, stripLocalePrefix } from '@/lib/i18n-config'
import { getMessages } from '@/utils/getT'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV_ITEMS = [
  { key: 'navAccount',       href: '/account'           },
  { key: 'navReservations',  href: '/account#reservations' },
  { key: 'navSavedListings', href: '/account-savelists' },
  { key: 'navPassword',      href: '/account-password'  },
  { key: 'navPayments',      href: '/account-billing'   },
] as const

export const PageNavigation = () => {
  const pathname = usePathname()
  const { locale } = stripLocalePrefix(pathname)
  const loc = locale ?? defaultLocale
  const T = getMessages(loc).accountPage

  return (
    <div className="container">
      <div className="hidden-scrollbar flex gap-x-8 overflow-x-auto md:gap-x-14">
        {NAV_ITEMS.map((item) => {
          const itemHref = normalizeHrefForLocale(loc, item.href)
          const isActive = pathname === itemHref
          return (
            <Link
              key={item.key}
              href={itemHref}
              className={`block shrink-0 border-b-2 py-5 md:py-8 ${
                isActive ? 'border-primary-500 font-medium' : 'border-transparent'
              }`}
            >
              {T[item.key]}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
