'use client'

import { useLocalizedRouteIndexes } from '@/contexts/localized-routes-context'
import { useLocaleSegment } from '@/contexts/locale-context'
import { localizeAppPathWithHash } from '@/lib/localized-path-shared'
import { normalizeHrefForLocale, stripLocalePrefix } from '@/lib/i18n-config'
import { useCallback } from 'react'

/** İstemci: layout’taki `LocalizedRoutesProvider` indeksini kullanır. */
export function useVitrinHref() {
  const locale = useLocaleSegment()
  const idx = useLocalizedRouteIndexes()
  return useCallback(
    (internalPath: string) => {
      const p = internalPath.startsWith('/') ? internalPath : `/${internalPath}`
      const { restPath } = stripLocalePrefix(p)
      const logical = restPath.startsWith('/') ? restPath : `/${restPath}`
      return normalizeHrefForLocale(locale, localizeAppPathWithHash(logical, locale, idx))
    },
    [locale, idx],
  )
}
