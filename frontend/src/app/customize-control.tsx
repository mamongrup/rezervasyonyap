'use client'

import SwitchDarkMode2 from '@/shared/SwitchDarkMode2'
import { Popover, PopoverButton, PopoverPanel } from '@headlessui/react'
import { Settings01Icon, ShoppingBag01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { useVitrinHref } from '@/hooks/use-vitrin-href'
import { defaultLocale, normalizeHrefForLocale, stripLocalePrefix } from '@/lib/i18n-config'
import { DEFAULT_HOME_PAGE_LINKS } from '@/lib/site-branding-seo'
import { fetchSitePreviewLinks } from '@/lib/site-preview-links-client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

type HomePreview = { name: string; slug: string }

const defaultHomePages: HomePreview[] = DEFAULT_HOME_PAGE_LINKS.map((l) => ({
  name: l.label,
  slug: l.path,
}))

const CustomizeControl = () => {
  const pathname = usePathname()
  const vitrinPath = useVitrinHref()
  const { locale: pathLocale, restPath } = stripLocalePrefix(pathname ?? '/')
  const loc = pathLocale ?? defaultLocale
  const [homePages, setHomePages] = useState<HomePreview[]>(defaultHomePages)

  useEffect(() => {
    let cancelled = false
    void fetchSitePreviewLinks()
      .then((d) => {
        if (cancelled || !Array.isArray(d?.homePageLinks)) return
        setHomePages(
          d.homePageLinks.map((x) => ({
            name: x.label,
            slug: x.path.startsWith('/') ? x.path : `/${x.path}`,
          })),
        )
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  const renderSwitchDarkMode = () => {
    return (
      <div className="mt-4">
        <span className="text-sm font-medium">Dark mode</span>
        <div className="mt-1.5">
          <SwitchDarkMode2 />
        </div>
      </div>
    )
  }

  const renderRadioThemeDir = () => {
    return (
      <div className="mt-4">
        <span className="text-sm font-medium">Theme Dir</span>
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          {(['ltr', 'rtl'] as const).map((value) => {
            return (
              <Link
                key={value}
                href={value === 'rtl' ? 'https://chisfis-nextjs-rtl.vercel.app/' : 'https://chisfis-nextjs.vercel.app/'}
                className={`flex cursor-pointer items-center rounded-full px-3.5 py-1.5 text-xs font-medium uppercase select-none ${
                  process.env.NEXT_PUBLIC_THEME_DIR === value
                    ? 'bg-black text-white shadow-lg shadow-black/10 dark:bg-neutral-100 dark:text-black'
                    : 'border border-neutral-300 hover:border-neutral-400 dark:border-neutral-700 dark:hover:border-neutral-600'
                }`}
              >
                {value}
              </Link>
            )
          })}
        </div>
      </div>
    )
  }

  const renderRadioHomePages = () => {
    return (
      <div className="mt-4">
        <span className="text-sm font-medium">Home Pages</span>
        <p className="mt-0.5 text-xs text-neutral-500">Genel ayarlardan (branding) yönetilir.</p>
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          {homePages.map((home, idx) => {
            const label = home.name
            const isActive = restPath === home.slug || (home.slug === '/' && restPath === '/')
            return (
              <Link
                key={`${idx}-${home.slug}`}
                href={normalizeHrefForLocale(loc, vitrinPath(home.slug))}
                className={`flex cursor-pointer items-center rounded-full px-3.5 py-1.5 text-xs font-medium select-none ${
                  isActive
                    ? 'bg-black text-white shadow-lg shadow-black/10 dark:bg-neutral-100 dark:text-black'
                    : 'border border-neutral-300 hover:border-neutral-400 dark:border-neutral-700 dark:hover:border-neutral-600'
                }`}
              >
                {label}
              </Link>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="relative hidden lg:block">
      <div className="fixed top-1/4 right-5 z-40 flex items-center">
        <Popover className="relative">
          {({ open }) => (
            <>
              <PopoverButton
                className={`rounded-xl border border-neutral-200 bg-white p-2.5 shadow-xl hover:bg-neutral-100 focus:outline-hidden dark:border-primary-600 dark:bg-primary-600 dark:hover:bg-primary-700 ${
                  open ? 'ring-primary-500 focus:ring-2' : ''
                }`}
              >
                <HugeiconsIcon icon={Settings01Icon} className="h-8 w-8" strokeWidth={1.75} />
              </PopoverButton>

              <PopoverPanel
                transition
                className="absolute right-0 z-10 mt-3 w-sm rounded-2xl bg-white custom-shadow-1 transition dark:bg-neutral-800 data-closed:translate-y-1 data-closed:opacity-0"
              >
                <div className="relative p-6">
                  <span className="text-xl font-semibold">Customize</span>
                  <div className="mt-4 w-full border-b border-neutral-200 dark:border-neutral-700"></div>
                  {renderRadioHomePages()}
                  {renderSwitchDarkMode()}
                  {renderRadioThemeDir()}
                </div>
                <div className="rounded-b-2xl bg-gray-50 p-5 dark:bg-white/5">
                  <a
                    className="flex w-full items-center justify-center rounded-xl! bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
                    href={'https://themeforest.net/item/chisfis-online-booking-nextjs-template/43399526'}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <HugeiconsIcon icon={ShoppingBag01Icon} className="h-4 w-4" strokeWidth={1.75} />
                    <span className="ms-2">Buy this template</span>
                  </a>
                </div>
              </PopoverPanel>
            </>
          )}
        </Popover>
      </div>
    </div>
  )
}

export default CustomizeControl
