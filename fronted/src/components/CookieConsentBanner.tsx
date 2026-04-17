'use client'

import { readCookieConsentFromStorage, writeCookieConsentToStorage } from '@/lib/cookie-consent-storage'
import { normalizeHrefForLocale } from '@/lib/i18n-config'
import { useVitrinHref } from '@/hooks/use-vitrin-href'
import { getMessages } from '@/utils/getT'
import { Cookie } from 'lucide-react'
import Link from 'next/link'
import { useParams, usePathname } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import clsx from 'clsx'

type Props = {
  locale: string
  /** Sunucudan: `ui.cookie_consent.banner_enabled === false` ise çubuk gösterilmez */
  bannerEnabled?: boolean
}

export default function CookieConsentBanner({ locale, bannerEnabled = true }: Props) {
  const params = useParams()
  const pathname = usePathname()
  const vitrinPath = useVitrinHref()
  const effectiveLocale = typeof params?.locale === 'string' ? params.locale : locale
  const t = getMessages(effectiveLocale).cookieConsent

  const [visible, setVisible] = useState(false)

  const hideOnRoute =
    pathname?.includes('/manage') ||
    pathname?.includes('/staff') ||
    pathname?.includes('/checkout') ||
    false

  useEffect(() => {
    if (!bannerEnabled || hideOnRoute) {
      setVisible(false)
      return
    }
    setVisible(!readCookieConsentFromStorage())
  }, [bannerEnabled, hideOnRoute, pathname])

  const accept = useCallback((mode: 'all' | 'essential') => {
    writeCookieConsentToStorage(mode)
    setVisible(false)
  }, [])

  if (!visible || !bannerEnabled || hideOnRoute) return null

  const cookiesHref = normalizeHrefForLocale(effectiveLocale, vitrinPath('/legal/cookies'))
  const privacyHref = normalizeHrefForLocale(effectiveLocale, vitrinPath('/legal/privacy'))

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[55] flex justify-center p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:p-4"
      role="dialog"
      aria-labelledby="cookie-consent-title"
      aria-live="polite"
    >
      <div
        className={clsx(
          'pointer-events-auto flex w-full min-w-0 max-w-[min(100%,42rem)] flex-col gap-3 rounded-2xl border border-neutral-200/80 bg-white/95 p-4 shadow-2xl shadow-neutral-900/10 backdrop-blur-md sm:max-w-2xl sm:flex-row sm:items-stretch sm:gap-4 dark:border-neutral-600/60 dark:bg-neutral-900/95 dark:shadow-black/40',
        )}
      >
        <div className="flex min-w-0 flex-1 items-start gap-3 sm:items-center">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-100 to-orange-50 text-amber-800 ring-1 ring-amber-200/80 dark:from-amber-900/40 dark:to-neutral-800 dark:text-amber-200 dark:ring-amber-800/50">
            <Cookie className="h-6 w-6" strokeWidth={1.75} aria-hidden />
          </span>
          <div className="min-w-0 max-w-full flex-1 overflow-hidden sm:py-0.5">
            <h2
              id="cookie-consent-title"
              className="break-words text-sm font-semibold tracking-tight text-neutral-900 dark:text-neutral-50"
            >
              {t.title}
            </h2>
            <p className="mt-1 break-words text-xs leading-relaxed text-neutral-600 [overflow-wrap:anywhere] dark:text-neutral-400">
              {t.description}
            </p>
            <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs font-medium">
              <Link href={cookiesHref} className="text-primary-600 underline decoration-primary-400/60 underline-offset-2 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300">
                {t.policyLink}
              </Link>
              <span className="text-neutral-300 dark:text-neutral-600" aria-hidden>
                ·
              </span>
              <Link href={privacyHref} className="text-primary-600 underline decoration-primary-400/60 underline-offset-2 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300">
                {t.privacyLink}
              </Link>
            </p>
          </div>
        </div>
        <div className="flex shrink-0 flex-col gap-2 sm:min-w-[220px]">
          <button
            type="button"
            onClick={() => accept('all')}
            className="rounded-xl bg-neutral-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-neutral-800 dark:bg-primary-600 dark:hover:bg-primary-500"
          >
            {t.acceptAll}
          </button>
          <button
            type="button"
            onClick={() => accept('essential')}
            className="rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-800 transition hover:bg-neutral-50 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100 dark:hover:bg-neutral-700"
          >
            {t.essentialOnly}
          </button>
        </div>
      </div>
    </div>
  )
}

export {
  COOKIE_CONSENT_STORAGE_KEY,
  readCookieConsentFromStorage,
  type StoredCookieConsent,
} from '@/lib/cookie-consent-storage'
