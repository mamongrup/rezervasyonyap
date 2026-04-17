import type { Metadata } from 'next'
import PortalStubPage from '@/components/manage/PortalStubPage'

export const metadata: Metadata = { title: 'Rezervasyonlar' }

export default function Page() {
  return (
    <PortalStubPage
      title="Rezervasyonlar"
      description="İlanlarınıza gelen tüm rezervasyonları takip edin."
      backPath="/manage/supplier"
      backLabel="Tedarikçi paneli"
    />
  )
}