'use client'

import { type CruiseCabinOption } from '@/lib/cruise-meta'
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'

type CruiseCabinContextValue = {
  cabins: CruiseCabinOption[]
  selectedCabin: CruiseCabinOption | null
  setSelectedCabinId: (id: string) => void
  selectCabinAndScroll: (id: string) => void
}

const CruiseCabinContext = createContext<CruiseCabinContextValue | null>(null)

export function CruiseCabinProvider({
  cabins,
  children,
}: {
  cabins: CruiseCabinOption[]
  children: ReactNode
}) {
  const [selectedId, setSelectedId] = useState('')
  const setSelectedCabinId = useCallback((id: string) => setSelectedId(id), [])
  const selectedCabin = useMemo(
    () => (selectedId ? cabins.find((c) => c.id === selectedId) ?? null : null),
    [cabins, selectedId],
  )

  const selectCabinAndScroll = useCallback((id: string) => {
    setSelectedId(id)
    document.getElementById('cruise-reservation-card')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  return (
    <CruiseCabinContext.Provider
      value={{
        cabins,
        selectedCabin,
        setSelectedCabinId,
        selectCabinAndScroll,
      }}
    >
      {children}
    </CruiseCabinContext.Provider>
  )
}

export function useCruiseCabinSelection() {
  return useContext(CruiseCabinContext)
}
