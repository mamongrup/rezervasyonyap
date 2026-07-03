'use client'

import type { CruiseCabinOption } from '@/lib/cruise-meta'
import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'

type CruiseCabinContextValue = {
  cabins: CruiseCabinOption[]
  selectedCabin: CruiseCabinOption | null
  setSelectedCabinId: (id: string) => void
}

const CruiseCabinContext = createContext<CruiseCabinContextValue | null>(null)

export function CruiseCabinProvider({
  cabins,
  children,
}: {
  cabins: CruiseCabinOption[]
  children: ReactNode
}) {
  const [selectedId, setSelectedId] = useState(() => cabins[0]?.id ?? '')
  const selectedCabin = useMemo(
    () => cabins.find((c) => c.id === selectedId) ?? cabins[0] ?? null,
    [cabins, selectedId],
  )

  return (
    <CruiseCabinContext.Provider
      value={{
        cabins,
        selectedCabin,
        setSelectedCabinId: setSelectedId,
      }}
    >
      {children}
    </CruiseCabinContext.Provider>
  )
}

export function useCruiseCabinSelection() {
  return useContext(CruiseCabinContext)
}
