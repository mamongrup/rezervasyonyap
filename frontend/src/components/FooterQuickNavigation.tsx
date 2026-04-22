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
import HeroSearchFormMobile from './HeroSearchFormMobile/HeroSearchFormMobile'

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

  return (
    <>
      <div
        ref={containerRef}
        className="fixed inset-x-0 bottom-0 z-30 flex items-center bg-white/90 px-2 py-2 shadow ring-1 shadow-slate-200/80 ring-slate-900/5 backdrop-blur-sm transition-transform lg:hidden dark:bg-neutral-950/90"
      >
        <div className="mx-auto flex w-full max-w-lg items-center justify-around">
          {/* Sol 2 ikon */}
          {sideItems.map((item) => {
            const itemHref = 'link' in item ? href(item.link!) : ''
            const isActive = 'link' in item && item.link ? pathname === itemHref : false

            if ('onClick' in item && item.onClick) {
              return (
                <button
                  key={item.name}
                  onClick={item.onClick}
                  aria-label={item.name}
                  className={clsx(
                    'flex flex-col items-center gap-0.5 px-3 py-1.5 text-neutral-500 dark:text-neutral-300',
                    isActive && 'text-primary-600 dark:text-primary-400',
                  )}
                >
                  <FooterBarIcon
                    lucide={'lucide' in item ? (item as { lucide?: LucideIcon }).lucide : undefined}
                    huge={'huge' in item ? (item as { huge?: IconSvgElement }).huge : undefined}
                  />
                  <span className="text-[10px] leading-none">{item.name}</span>
                </button>
              )
            }

            return (
              <Link
                key={item.name}
                href={itemHref}
                aria-label={item.name}
                className={clsx(
                  'flex flex-col items-center gap-0.5 px-3 py-1.5 text-neutral-500 dark:text-neutral-300',
                  isActive && 'text-primary-600 dark:text-primary-400',
                )}
              >
                <FooterBarIcon
                  lucide={'lucide' in item ? (item as { lucide?: LucideIcon }).lucide : undefined}
                  huge={'huge' in item ? (item as { huge?: IconSvgElement }).huge : undefined}
                />
                <span className="text-[10px] leading-none">{item.name}</span>
              </Link>
            )
          })}

          {/* Orta: Chat butonu (yükseltilmiş) */}
          <button
            onClick={openChat}
            aria-label={bn.assistantAria}
            className="relative -mt-5 flex h-14 w-14 items-center justify-center rounded-full bg-primary-600 text-white shadow-lg ring-4 ring-white dark:ring-neutral-950 hover:bg-primary-700 transition-colors"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="h-7 w-7">
              <path d="M12 2C6.477 2 2 6.164 2 11.299c0 2.862 1.388 5.415 3.567 7.12L4.5 22l4.29-2.123A10.854 10.854 0 0012 20.598c5.523 0 10-4.164 10-9.299S17.523 2 12 2z" />
            </svg>
          </button>

          {/* Sağ 2 ikon */}
          {sideItemsRight.map((item) => {
            const itemHref = 'link' in item ? href(item.link!) : ''
            const isActive = 'link' in item && item.link ? pathname === itemHref : false

            if ('onClick' in item && item.onClick) {
              return (
                <button
                  key={item.name}
                  onClick={item.onClick}
                  aria-label={item.name}
                  className={clsx(
                    'flex flex-col items-center gap-0.5 px-3 py-1.5 text-neutral-500 dark:text-neutral-300',
                    isActive && 'text-primary-600 dark:text-primary-400',
                  )}
                >
                  <FooterBarIcon
                    lucide={'lucide' in item ? (item as { lucide?: LucideIcon }).lucide : undefined}
                    huge={'huge' in item ? (item as { huge?: IconSvgElement }).huge : undefined}
                  />
                  <span className="text-[10px] leading-none">{item.name}</span>
                </button>
              )
            }

            return (
              <Link
                key={item.name}
                href={itemHref}
                aria-label={item.name}
                className={clsx(
                  'flex flex-col items-center gap-0.5 px-3 py-1.5 text-neutral-500 dark:text-neutral-300',
                  isActive && 'text-primary-600 dark:text-primary-400',
                )}
              >
                <FooterBarIcon
                  lucide={'lucide' in item ? (item as { lucide?: LucideIcon }).lucide : undefined}
                  huge={'huge' in item ? (item as { huge?: IconSvgElement }).huge : undefined}
                />
                <span className="text-[10px] leading-none">{item.name}</span>
              </Link>
            )
          })}
        </div>
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
