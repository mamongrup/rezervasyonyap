import type { Metadata } from 'next'
import PortalStubPage from '@/components/manage/PortalStubPage'

export const metadata: Metadata = { title: 'Müşteri Listesi' }

export default function Page() {
  return (
    <PortalStubPage
      title="Müşteri Listesi"
      description="Kurumunuz üzerinden rezervasyon yapan müşterileri görüntüleyin."
      backPath="/manage/staff"
      backLabel="Personel paneli"
    />
  )
}