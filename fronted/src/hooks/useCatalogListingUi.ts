'use client'

import { defaultLocale } from '@/lib/i18n-config'
import type { AppMessages } from '@/utils/getT'
import { getMessages } from '@/utils/getT'
import { useParams } from 'next/navigation'
import { useMemo } from 'react'

export type CatalogListingUi = AppMessages['manageCatalogListing']

/** Katalog ilan düzenleyici — URL diline göre `manageCatalogListing` metinleri */
export function useCatalogListingUi(): CatalogListingUi {
  const params = useParams()
  const locale = typeof params?.locale === 'string' ? params.locale : defaultLocale
  return useMemo(() => getMessages(locale).manageCatalogListing, [locale])
}
