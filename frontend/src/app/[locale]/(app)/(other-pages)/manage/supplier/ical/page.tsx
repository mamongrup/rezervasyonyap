import type { Metadata } from 'next'
import PortalStubPage from '@/components/manage/PortalStubPage'

export const metadata: Metadata = { title: 'iCal Senkronu' }

export default function Page() {
  return (
    <PortalStubPage
      title="iCal Senkronu"
      description="Airbnb, Booking.com gibi platformlarla takvim senkronizasyonu yapın."
      backPath="/manage/supplier"
      backLabel="Tedarikçi paneli"
    />
  )
}