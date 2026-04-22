import type { Metadata } from 'next'
import PortalStubPage from '@/components/manage/PortalStubPage'

export const metadata: Metadata = { title: 'Acente Profili' }

export default function Page() {
  return (
    <PortalStubPage
      title="Acente Profili"
      description="Acente bilgileri, logo ve iletişim detaylarını yönetin."
      backPath="/manage/agency"
      backLabel="Acente paneli"
    />
  )
}