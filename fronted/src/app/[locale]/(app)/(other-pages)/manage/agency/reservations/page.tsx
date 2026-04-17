import type { Metadata } from 'next'
import PortalStubPage from '@/components/manage/PortalStubPage'

export const metadata: Metadata = { title: 'Rezervasyonlar' }

export default function Page() {
  return (
    <PortalStubPage
      title="Rezervasyonlar"
      description="Acenteniz üzerinden yapılan tüm rezervasyonları yönetin."
      backPath="/manage/agency"
      backLabel="Acente paneli"
    />
  )
}