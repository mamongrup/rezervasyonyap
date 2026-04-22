'use client'

import { useMemo } from 'react'
import { useAvailableLocales } from '@/contexts/available-locales-context'
import {
  buildManageAiLocaleRows,
  resolveManagePrimaryLocale,
  type ManageAiLocaleRow,
} from '@/lib/manage-ai-locale-rows'

export type { ManageAiLocaleRow }

export function useManageAiLocaleRows() {
  const available = useAvailableLocales()
  return useMemo(() => {
    const allLocales = buildManageAiLocaleRows(available)
    const localeCodes = allLocales.map((l) => l.code)
    const primaryLocale = resolveManagePrimaryLocale(localeCodes)
    const translateTargets = allLocales.filter((l) => l.code !== primaryLocale)
    return { allLocales, translateTargets, localeCodes, primaryLocale }
  }, [available])
}
