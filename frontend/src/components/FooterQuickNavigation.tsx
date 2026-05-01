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
import { RefObject, useCallback, useEffect, useRef, useState } from 'react'

const DEFAULT_ACCOUNT_PATH = '/account'
import { fetchSitePreviewLinks } from '@/lib/site-preview-links-client'
import { useIntersection } from 'react-use'
import { useAside } from './aside'
import HeroSearchFormMobileLazy from './HeroSearchFormMobile/HeroSearchFormMobileLazy'

const SCROLL_THRESHOLD = 80

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
  const containerRef = useRef<HTMLDivElement>(null)
  const rafId = useRef<number | null>(null)
  const lastScrollY = useRef<number>(0)
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

  const intersection = useIntersection(containerRef as RefObject<HTMLDivElement>, {
    root: null,
    rootMargin: '0px',
    threshold: 1,
  })
  const isInViewport = intersection && intersection.intersectionRatio >= 1

  useEffect(() => {
    lastScrollY.current = window.pageYOffset
  }, [isInViewport])

  const showHideHeaderMenu = useCallback(() => {
    if (!containerRef?.current) return
    const currentScrollPos = window.pageYOffset

    if (currentScrollPos > lastScrollY.current) {
      if (isInViewport && currentScrollPos - lastScrollY.current < SCROLL_THRESHOLD) return
      containerRef.current.classList.add('translate-y-[calc(100%+1.5rem)]')
    } else {
      if (!isInViewport && lastScrollY.current - currentScrollPos < SCROLL_THRESHOLD) return
      containerRef.current.classList.remove('translate-y-[calc(100%+1.5rem)]')
    }
    lastScrollY.current = currentScrollPos
  }, [isInViewport])

  const handleEventScroll = useCallback(() => {
    rafId.current = window.requestAnimationFrame(showHideHeaderMenu)
  }, [showHideHeaderMenu])

  useEffect(() => {
    window.addEventListener('scroll', handleEventScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', handleEventScroll)
      if (rafId.current) window.cancelAnimationFrame(rafId.current)
    }
  }, [handleEventScroll])

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

  const navItemClass =
    'flex min-w-0 max-w-full flex-col items-center justify-end gap-0.5 px-0.5 py-1 text-neutral-500 dark:text-neutral-300'

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
          aria-label={item.name}
          className={clsx(navItemClass, activeCls)}
        >
          <FooterBarIcon
            lucide={'lucide' in item ? (item as { lucide?: LucideIcon }).lucide : undefined}
            huge={'huge' in item ? (item as { huge?: IconSvgElement }).huge : undefined}
          />
          <span className="w-full truncate text-center text-[10px] leading-none">{item.name}</span>
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
        <span className="w-full truncate text-center text-[10px] leading-none">{item.name}</span>
      </Link>
    )
  }

  return (
    <>
      <div
        ref={containerRef}
        className="fixed inset-x-0 bottom-0 z-30 max-w-[100dvw] min-w-0 overflow-x-clip bg-white/90 px-2.5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow ring-1 shadow-slate-200/80 ring-slate-900/5 backdrop-blur-sm transition-transform lg:hidden dark:bg-neutral-950/90"
      >
        {/* Chisfis: içerik `max-w-lg` + ortada — taşma ve aşırı yayılma azalır */}
        <nav
          className="mx-auto grid w-full min-w-0 max-w-lg grid-cols-5 items-end justify-items-center gap-x-0"
          role="navigation"
        >
          <div className="flex w-full min-w-0 justify-center">{renderSideItem(sideItems[0])}</div>
          <div className="flex w-full min-w-0 justify-center">{renderSideItem(sideItems[1])}</div>
          <div className="flex w-full min-w-0 justify-center pb-0.5">
            <button
              type="button"
              onClick={openChat}
              aria-label={bn.assistantAria}
              className="relative -mt-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary-600 text-white shadow-lg ring-2 ring-white transition-colors hover:bg-primary-700 dark:ring-neutral-950"
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
      <HeroSearchFormMobileLazy
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        locale={loc}
      />
    </>
  )
}

export default FooterQuickNavigation
