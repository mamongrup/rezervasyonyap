'use client'

import {
  buildLocalizedRouteIndexes,
  type LocalizedRouteIndexes,
  type LocalizedRouteRow,
} from '@/lib/localized-path-shared'
import { createContext, useContext, useMemo } from 'react'

const Ctx = createContext<LocalizedRouteIndexes>({ forward: {}, reverse: {} })

export function LocalizedRoutesProvider({
  routes,
  children,
}: {
  routes: LocalizedRouteRow[]
  children: React.ReactNode
}) {
  const value = useMemo(() => buildLocalizedRouteIndexes(routes), [routes])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useLocalizedRouteIndexes(): LocalizedRouteIndexes {
  return useContext(Ctx)
}
