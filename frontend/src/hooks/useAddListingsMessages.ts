'use client'

import { defaultLocale } from '@/lib/i18n-config'
import { getMessages } from '@/utils/getT'
import { useParams } from 'next/navigation'
import { useMemo } from 'react'

/** İlan ekleme sihirbazı — URL diline göre `addListings` çevirileri */
export function useAddListingsMessages() {
  const params = useParams()
  const locale = typeof params?.locale === 'string' ? params.locale : defaultLocale
  return useMemo(() => getMessages(locale).addListings, [locale])
}
