'use client'

import { localeFromPathname } from '@/lib/i18n-config'
import { usePathname } from 'next/navigation'
import { useEffect } from 'react'

const rtlLocales = new Set<string>([])

export function LocaleHtmlAttributes() {
  const pathname = usePathname()
  useEffect(() => {
    const loc = localeFromPathname(pathname)
    document.documentElement.lang = loc
    document.documentElement.dir = rtlLocales.has(loc) ? 'rtl' : 'ltr'
  }, [pathname])
  return null
}
