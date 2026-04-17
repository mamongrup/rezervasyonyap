'use client'

import { useLocalizedRouteIndexes } from '@/contexts/localized-routes-context'
import { useLocaleSegment } from '@/contexts/locale-context'
import { localizeAppPathWithHash } from '@/lib/localized-path-shared'
import { prefixLocale } from '@/lib/i18n-config'
import { useCallback } from 'react'

/** İstemci: layout’taki `LocalizedRoutesProvider` indeksini kullanır. */
export function useVitrinHref() {
  const locale = useLocaleSegment()
  const idx = useLocalizedRouteIndexes()
  return useCallback(
    (internalPath: string) => {
      const p = internalPath.startsWith('/') ? internalPath : `/${internalPath}`
      return prefixLocale(locale, localizeAppPathWithHash(p, locale, idx))
    },
    [locale, idx],
  )
}
