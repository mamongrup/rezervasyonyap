'use client'

import { defaultLocale, normalizeHrefForLocale, stripLocalePrefix } from '@/lib/i18n-config'
import { getMessages } from '@/utils/getT'
import { Home01Icon, Menu01Icon, UserCircleIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/react'
import { Search } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import clsx from 'clsx'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

const DEFAULT_ACCOUNT_PATH = '/account'
import { fetchSitePreviewLinks } from '@/lib/site-preview-links-client'
import FooterCustomerSupportSheet, {
  FooterCustomerSupportButton,
} from '@/components/FooterCustomerSupportSheet'
import { SearchModal } from '@/components/search/GlobalSearch'
import { useAside } from './aside'

function FooterBarIcon({
  lucide,
  huge,
}: {
  lucide?: LucideIcon
  huge?: IconSvgElement
}) {
  if (lucide) {
    const Lucide = lucide
    return <Lucide className="size-6" />
  }
  if (huge) {
    return <HugeiconsIcon icon={huge} className="size-6" strokeWidth={1.75} />
  }
  return null
}

const FooterQuickNavigation = () => {
  const pathname = usePathname()
  const { locale } = stripLocalePrefix(pathname)
  const loc = locale ?? defaultLocale
  const m = getMessages(loc)
  const bn = m.mobile.bottomNav
  const href = (path: string) => normalizeHrefForLocale(loc, path)
  const { open: openAside } = useAside()
  const [searchOpen, setSearchOpen] = useState(false)
  const [supportOpen, setSupportOpen] = useState(false)
  const [accountPath, setAccountPath] = useState(DEFAULT_ACCOUNT_PATH)

  useEffect(() => {
    let cancelled = false
    void fetchSitePreviewLinks()
      .then((d) => {
        if (cancelled) return
        if (typeof d?.mobileAccountPath === 'string' && d.mobileAccountPath.startsWith('/')) {
          setAccountPath(d.mobileAccountPath)
        }
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  function openSupportMenu() {
    setSupportOpen(true)
  }

  const homeHref = href('/')

  const navItems = [
    {
      name: bn.home,
      link: '/',
      huge: Home01Icon,
    },
    {
      name: bn.search,
      lucide: Search,
      onClick: () => setSearchOpen(true),
    },
    {
      name: bn.account,
      link: accountPath,
      huge: UserCircleIcon,
    },
    {
      name: bn.menu,
      huge: Menu01Icon,
      onClick: () => openAside('sidebar-navigation'),
    },
  ] as const

  /** Chisfis FooterQuickNavigation: `-mx-2 … px-2` — 5 öğe için dar ekranda `px-1` */
  const navItemClass =
    '-mx-2 flex min-w-0 max-w-full flex-col items-center justify-between px-1 text-neutral-500 sm:px-2 dark:text-neutral-300'

  function renderSideItem(item: (typeof navItems)[number]) {
    const itemHref = 'link' in item ? href(item.link) : ''
    const isActive =
      'link' in item && item.link === '/'
        ? pathname === homeHref
        : 'link' in item && item.link
          ? pathname === itemHref
          : false
    const activeCls = isActive && 'text-primary-600 dark:text-primary-400'

    if ('onClick' in item && item.onClick) {
      return (
        <button
          type="button"
          key={item.name}
          onClick={item.onClick}
          aria-label={item.name}
          className={clsx(navItemClass, 'touch-manipulation cursor-pointer', activeCls)}
        >
          <FooterBarIcon
            lucide={'lucide' in item ? (item as { lucide?: LucideIcon }).lucide : undefined}
            huge={'huge' in item ? (item as { huge?: IconSvgElement }).huge : undefined}
          />
          <p className="max-w-full truncate text-center text-xs/6">{item.name}</p>
        </button>
      )
    }

    return (
      <Link
        key={item.name}
        href={itemHref}
        aria-label={item.name}
        className={clsx(navItemClass, activeCls)}
      >
        <FooterBarIcon
          lucide={'lucide' in item ? (item as { lucide?: LucideIcon }).lucide : undefined}
          huge={'huge' in item ? (item as { huge?: IconSvgElement }).huge : undefined}
        />
        <p className="max-w-full truncate text-center text-xs/6">{item.name}</p>
      </Link>
    )
  }

  return (
    <>
      <div
        className="pointer-events-auto fixed inset-x-0 bottom-0 z-[70] flex items-center gap-6 bg-white/90 px-2.5 py-4 shadow ring-1 shadow-slate-200/80 ring-slate-900/5 backdrop-blur-sm lg:hidden dark:bg-neutral-950/90"
      >
        {/*
          Chisfis: `mx-auto flex w-full max-w-lg justify-around`.
          Bizde 5 öğe (ortada sohbet): aynı max-w-lg + explicit minmax sütun — 400px taşmaz.
        */}
        <nav
          className="mx-auto grid w-full min-w-0 max-w-lg touch-manipulation grid-cols-[repeat(5,minmax(0,1fr))] items-end justify-items-center"
          role="navigation"
        >
          <div className="flex w-full min-w-0 justify-center">{renderSideItem(navItems[0])}</div>
          <div className="flex w-full min-w-0 justify-center">{renderSideItem(navItems[1])}</div>
          <div className="flex w-full min-w-0 justify-center pb-0.5">
            <FooterCustomerSupportButton onClick={openSupportMenu} ariaLabel={bn.supportAria} />
          </div>
          <div className="flex w-full min-w-0 justify-center">{renderSideItem(navItems[2])}</div>
          <div className="flex w-full min-w-0 justify-center">{renderSideItem(navItems[3])}</div>
        </nav>
      </div>

      {/* İlan adı / özellik araması — 3+ harfte canlı öneri, /ara tam sonuç */}
      {searchOpen ? <SearchModal onClose={() => setSearchOpen(false)} locale={loc} /> : null}
      <FooterCustomerSupportSheet open={supportOpen} onClose={() => setSupportOpen(false)} locale={loc} />
    </>
  )
}

export default FooterQuickNavigation
