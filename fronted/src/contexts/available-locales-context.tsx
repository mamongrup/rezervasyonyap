'use client'

import { createContext, useContext } from 'react'

export type AvailableLocaleOption = { code: string; name: string }

const Ctx = createContext<AvailableLocaleOption[]>([
  { code: 'tr', name: 'Türkçe' },
  { code: 'en', name: 'English' },
])

export function AvailableLocalesProvider({
  locales,
  children,
}: {
  locales: AvailableLocaleOption[]
  children: React.ReactNode
}) {
  return <Ctx.Provider value={locales.length > 0 ? locales : [{ code: 'tr', name: 'Türkçe' }]}>{children}</Ctx.Provider>
}

export function useAvailableLocales(): AvailableLocaleOption[] {
  return useContext(Ctx)
}
