'use client'

import { useVitrinHref } from '@/hooks/use-vitrin-href'
import { getMessages } from '@/utils/getT'
import { resolveCatalogMenuIcon } from '@/lib/catalog-menu-icons'
import type { CatalogMenuResolvedItem } from '@/types/catalog-menu'
import { defaultLocale, normalizeHrefForLocale, stripLocalePrefix } from '@/lib/i18n-config'
import { CloseButton, Popover, PopoverButton, PopoverPanel } from '@headlessui/react'
import { ArrowDown01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

type Props = {
  /** Sunucudan — yapı + seçilen dil için çözümlenmiş metinler */
  items: CatalogMenuResolvedItem[]
}

export default function CategoriesDropdown({ items }: Props) {
  const pathName = usePathname()
  const vitrinPath = useVitrinHref()
  const { locale } = stripLocalePrefix(pathName)
  const loc = locale ?? defaultLocale
  const m = getMessages(loc)
  const nav = m.navMenus.catalogMenu

  return (
    <Popover className="group">
      <PopoverButton className="-m-2.5 flex items-center p-2.5 text-sm font-medium text-neutral-700 group-hover:text-neutral-950 focus:outline-hidden dark:text-neutral-300 dark:group-hover:text-neutral-100">
        {nav.buttonLabel}
        <HugeiconsIcon
          icon={ArrowDown01Icon}
          className="ms-1 size-4 group-data-open:rotate-180"
          strokeWidth={1.75}
          aria-hidden="true"
        />
      </PopoverButton>
      <PopoverPanel
        anchor={{
          to: 'bottom start',
          gap: 16,
        }}
        transition
        className="z-40 w-[560px] rounded-3xl shadow-lg ring-1 ring-black/5 transition duration-200 ease-in-out sm:px-0 dark:ring-white/10 data-closed:translate-y-1 data-closed:opacity-0"
      >
        <div>
          <div className="relative grid grid-cols-2 gap-4 bg-white p-6 dark:bg-neutral-800">
            {items.map((item) => {
              const raw = item.href.startsWith('/') ? item.href : `/${item.href}`
              const href = normalizeHrefForLocale(loc, vitrinPath(raw))
              const isActive = pathName === href
              const Icon = resolveCatalogMenuIcon(item.icon)
              return (
                <CloseButton
                  as={Link}
                  key={item.id}
                  href={href}
                  className={`focus-visible:ring-opacity-50 -m-3 flex items-center rounded-lg p-2 focus:outline-none focus-visible:ring focus-visible:ring-orange-500 ${
                    isActive ? 'bg-neutral-50 dark:bg-neutral-700' : 'hover:bg-neutral-50 dark:hover:bg-neutral-700'
                  }`}
                >
                  <div className="flex size-10 flex-shrink-0 items-center justify-center rounded-md bg-neutral-50 text-primary-500 sm:h-12 sm:w-12 dark:bg-neutral-700 dark:text-primary-200">
                    <HugeiconsIcon icon={Icon} size={28} color="currentColor" strokeWidth={1.5} />
                  </div>
                  <div className="ms-4 space-y-0.5">
                    <p className="text-sm font-medium">{item.title}</p>
                    <p className="line-clamp-1 text-xs text-neutral-500 dark:text-neutral-300">{item.description}</p>
                  </div>
                </CloseButton>
              )
            })}
          </div>
          <div className="bg-neutral-50 p-4 dark:bg-neutral-700">
            <Link
              href={normalizeHrefForLocale(loc, vitrinPath('/'))}
              className="focus-visible:ring-opacity-50 flow-root space-y-0.5 rounded-md px-2 py-2 focus:outline-none focus-visible:ring focus-visible:ring-orange-500"
            >
              <span className="flex items-center">
                <span className="text-sm font-medium">{nav.footerDoc}</span>
              </span>
              <span className="line-clamp-1 text-sm text-gray-500 dark:text-neutral-400">{nav.footerDescription}</span>
            </Link>
          </div>
        </div>
      </PopoverPanel>
    </Popover>
  )
}
