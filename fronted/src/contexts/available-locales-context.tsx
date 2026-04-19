'use client'

/**
 * Sitede aktif diller (server'da `fetchActiveLocales()` ile DB'den çekilir).
 *
 * Default fallback: `SITE_LOCALE_CATALOG` (6 dil — tr/en/de/ru/zh/fr).
 * DB tek dil dönerse bile UI 6-dil sekmelerini gösterebilsin diye
 * boş/tekil sağlayıcılarda da katalog kullanılır.
 */

import { createContext, useContext } from 'react'
import { SITE_LOCALE_CATALOG } from '@/lib/i18n-catalog-locales'

export type AvailableLocaleOption = { code: string; name: string }

const FALLBACK_LOCALES: AvailableLocaleOption[] = SITE_LOCALE_CATALOG.map((l) => ({
  code: l.code,
  name: l.name,
}))

const Ctx = createContext<AvailableLocaleOption[]>(FALLBACK_LOCALES)

export function AvailableLocalesProvider({
  locales,
  children,
}: {
  locales: AvailableLocaleOption[]
  children: React.ReactNode
}) {
  const value = locales.length > 0 ? locales : FALLBACK_LOCALES
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useAvailableLocales(): AvailableLocaleOption[] {
  return useContext(Ctx)
}
