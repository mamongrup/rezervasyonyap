'use client'

import { Suspense, type ReactNode } from 'react'
import { VillaStayBookingProvider } from './villa-stay-booking-context'

export default function VillaStayBookingShell({
  enabled,
  children,
}: {
  enabled: boolean
  children: ReactNode
}) {
  if (!enabled) return children
  return (
    <Suspense fallback={children}>
      <VillaStayBookingProvider>{children}</VillaStayBookingProvider>
    </Suspense>
  )
}
