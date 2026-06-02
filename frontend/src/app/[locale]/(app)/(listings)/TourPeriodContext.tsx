'use client'

import {
  buildTourPeriodSelectOptions,
  type TourPeriodOption,
} from '@/lib/tour-periods'
import type { TourFlightScheduleRow } from '@/lib/tour-flight-schedule'
import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

type TourPeriodContextValue = {
  options: TourPeriodOption[]
  selected: TourPeriodOption | null
  setSelected: (period: TourPeriodOption | null) => void
  flightSchedules: TourFlightScheduleRow[]
  selectedFlight: TourFlightScheduleRow | null
}

const TourPeriodContext = createContext<TourPeriodContextValue | null>(null)

export function useTourPeriodSelection() {
  const ctx = useContext(TourPeriodContext)
  if (!ctx) {
    throw new Error('useTourPeriodSelection must be used within TourPeriodProvider')
  }
  return ctx
}

export function TourPeriodProvider({
  bookablePeriods,
  flightSchedules,
  currencyCode,
  children,
}: {
  bookablePeriods: TourPeriodOption[]
  flightSchedules: TourFlightScheduleRow[]
  currencyCode: string
  children: ReactNode
}) {
  const options = useMemo(
    () =>
      buildTourPeriodSelectOptions(bookablePeriods, flightSchedules, currencyCode),
    [bookablePeriods, flightSchedules, currencyCode],
  )

  const firstBookable = options.find((p) => p.bookable !== false) ?? options[0] ?? null
  const [selected, setSelected] = useState<TourPeriodOption | null>(firstBookable)

  const selectedFlight = useMemo(() => {
    if (!selected?.startDate) return null
    return (
      flightSchedules.find((f) => f.departureDate === selected.startDate) ??
      flightSchedules.find((f) => f.returnDate === selected.endDate) ??
      null
    )
  }, [flightSchedules, selected])

  const value = useMemo(
    () => ({
      options,
      selected,
      setSelected,
      flightSchedules,
      selectedFlight,
    }),
    [options, selected, flightSchedules, selectedFlight],
  )

  return <TourPeriodContext.Provider value={value}>{children}</TourPeriodContext.Provider>
}
