'use client'

import { readCookieConsentFromStorage, writeCookieConsentToStorage } from '@/lib/cookie-consent-storage'
import { normalizeHrefForLocale } from '@/lib/i18n-config'
import { useVitrinHref } from '@/hooks/use-vitrin-href'
import { getMessages } from '@/utils/getT'
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
      className="pointer-events-auto fixed inset-x-0 bottom-0 z-[55] border-t border-neutral-200 bg-white shadow-[0_-4px_24px_rgba(0,0,0,0.07)] dark:border-neutral-700 dark:bg-neutral-900"
      role="dialog"
      aria-labelledby="cookie-consent-title"
      aria-live="polite"
    >
      <div className="mx-auto flex w-full max-w-7xl flex-col items-start gap-4 px-4 py-4 sm:flex-row sm:items-center sm:gap-6 sm:px-6 lg:px-8">
        {/* Metin */}
        <p
          id="cookie-consent-title"
          className={clsx(
            'flex-1 text-sm leading-relaxed text-neutral-700 dark:text-neutral-300',
          )}
        >
          {t.description}{' '}
          <Link
            href={privacyHref}
            className="font-medium text-primary-600 underline underline-offset-2 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
          >
            {t.privacyLink}
          </Link>
        </p>

        {/* Butonlar */}
        <div className="flex shrink-0 flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => accept('essential')}
            className="rounded-lg border border-neutral-300 bg-white px-5 py-2 text-sm font-medium text-neutral-800 transition hover:bg-neutral-50 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100 dark:hover:bg-neutral-700"
          >
            {t.essentialOnly}
          </button>
          <button
            type="button"
            onClick={() => accept('all')}
            className="rounded-lg bg-primary-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-500 active:bg-primary-700"
          >
            {t.acceptAll}
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
