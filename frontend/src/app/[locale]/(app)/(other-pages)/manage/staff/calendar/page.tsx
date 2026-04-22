import type { Metadata } from 'next'
import PortalStubPage from '@/components/manage/PortalStubPage'

export const metadata: Metadata = { title: 'Takvim Görünümü' }

export default function Page() {
  return (
    <PortalStubPage
      title="Takvim Görünümü"
      description="Rezervasyonları takvim üzerinde görselleştirin."
      backPath="/manage/staff"
      backLabel="Personel paneli"
    />
  )
}