import type { Metadata } from 'next'
import PortalStubPage from '@/components/manage/PortalStubPage'

export const metadata: Metadata = { title: 'iCal Senkronu' }

export default function Page() {
  return (
    <PortalStubPage
      title="iCal Senkronu"
      description="Harici takvimlerle iCal senkronizasyonu yapın."
      backPath="/manage/agency"
      backLabel="Acente paneli"
    />
  )
}