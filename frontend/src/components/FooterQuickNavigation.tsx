'use client'

import { defaultLocale, normalizeHrefForLocale, stripLocalePrefix } from '@/lib/i18n-config'
import { getMessages } from '@/utils/getT'
import { FavouriteIcon, Menu01Icon, UserCircleIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/react'
import { Search } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import clsx from 'clsx'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

const DEFAULT_ACCOUNT_PATH = '/account'
import { fetchSitePreviewLinks } from '@/lib/site-preview-links-client'
import { useAside } from './aside'
import HeroSearchFormMobile from './HeroSearchFormMobile/HeroSearchFormMobile'

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

  function openChat() {
    window.dispatchEvent(new CustomEvent('open-chat'))
  }

  const sideItems = [
    {
      name: 'Ara',
      lucide: Search,
      onClick: () => setSearchOpen(true),
    },
    {
      name: 'Favoriler',
      link: '/account-savelists',
      huge: FavouriteIcon,
    },
  ]

  const sideItemsRight = [
    {
      name: 'Hesap',
      link: accountPath,
      huge: UserCircleIcon,
    },
    {
      name: 'Menü',
      huge: Menu01Icon,
      onClick: () => openAside('sidebar-navigation'),
    },
  ]

  /** Chisfis FooterQuickNavigation: `-mx-2 … px-2` — 5 öğe için dar ekranda `px-1` */
  const navItemClass =
    '-mx-2 flex min-w-0 max-w-full flex-col items-center justify-between px-1 text-neutral-500 sm:px-2 dark:text-neutral-300'

  function renderSideItem(item: (typeof sideItems)[0] | (typeof sideItemsRight)[0]) {
    const itemHref = 'link' in item ? href(item.link!) : ''
    const isActive = 'link' in item && item.link ? pathname === itemHref : false
    const activeCls = isActive && 'text-primary-600 dark:text-primary-400'

    if ('onClick' in item && item.onClick) {
      return (
        <button
          type="button"
          key={item.name}
          onClick={item.onClick}
          onTouchEnd={(e) => {
            e.preventDefault()
            item.onClick?.()
          }}
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
        className="fixed inset-x-0 bottom-0 z-30 flex items-center gap-6 bg-white/90 px-2.5 py-4 shadow ring-1 shadow-slate-200/80 ring-slate-900/5 backdrop-blur-sm transition-transform lg:hidden dark:bg-neutral-950/90"
      >
        {/*
          Chisfis: `mx-auto flex w-full max-w-lg justify-around`.
          Bizde 5 öğe (ortada sohbet): aynı max-w-lg + explicit minmax sütun — 400px taşmaz.
        */}
        <nav
          className="mx-auto grid w-full min-w-0 max-w-lg touch-manipulation grid-cols-[repeat(5,minmax(0,1fr))] items-end justify-items-center"
          role="navigation"
        >
          <div className="flex w-full min-w-0 justify-center">{renderSideItem(sideItems[0])}</div>
          <div className="flex w-full min-w-0 justify-center">{renderSideItem(sideItems[1])}</div>
          <div className="flex w-full min-w-0 justify-center pb-0.5">
            <button
              type="button"
              onClick={openChat}
              onTouchEnd={(e) => {
                e.preventDefault()
                openChat()
              }}
              aria-label={bn.assistantAria}
              className="relative -mt-2 flex h-11 w-11 shrink-0 touch-manipulation cursor-pointer items-center justify-center rounded-full bg-primary-600 text-white shadow-lg ring-2 ring-white transition-colors hover:bg-primary-700 dark:ring-neutral-950"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                <path d="M12 2C6.477 2 2 6.164 2 11.299c0 2.862 1.388 5.415 3.567 7.12L4.5 22l4.29-2.123A10.854 10.854 0 0012 20.598c5.523 0 10-4.164 10-9.299S17.523 2 12 2z" />
              </svg>
            </button>
          </div>
          <div className="flex w-full min-w-0 justify-center">{renderSideItem(sideItemsRight[0])}</div>
          <div className="flex w-full min-w-0 justify-center">{renderSideItem(sideItemsRight[1])}</div>
        </nav>
      </div>

      {/* Masaüstü ile aynı tam arama formu — mobil bottom nav'dan açılır */}
      <HeroSearchFormMobile
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        locale={loc}
      />
    </>
  )
}

export default FooterQuickNavigation
