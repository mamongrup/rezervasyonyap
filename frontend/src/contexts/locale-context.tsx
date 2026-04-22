'use client'

import { createContext, useContext } from 'react'

const LocaleContext = createContext<string>('tr')

export function LocaleProvider({ locale, children }: { locale: string; children: React.ReactNode }) {
  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>
}

export function useLocaleSegment(): string {
  return useContext(LocaleContext)
}
