'use client'

import { intlDateLocaleTag } from '@/lib/i18n-config'
import { getMessages } from '@/utils/getT'
import { useParams } from 'next/navigation'

/** URL `[locale]` segmentinden çeviri sözlüğü ve tarih biçimi. */
export function useAppLocale() {
  const params = useParams()
  const locale = typeof params?.locale === 'string' ? params.locale : 'tr'
  return {
    locale,
    messages: getMessages(locale),
    dateLocale: intlDateLocaleTag(locale),
  }
}
