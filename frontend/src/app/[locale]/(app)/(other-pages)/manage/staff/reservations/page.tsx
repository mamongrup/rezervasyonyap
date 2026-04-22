import type { Metadata } from 'next'
import PortalStubPage from '@/components/manage/PortalStubPage'

export const metadata: Metadata = { title: 'Tüm Rezervasyonlar' }

export default function Page() {
  return (
    <PortalStubPage
      title="Tüm Rezervasyonlar"
      description="Kurumunuza ait tüm rezervasyonları listeler."
      backPath="/manage/staff"
      backLabel="Personel paneli"
    />
  )
}