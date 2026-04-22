import type { Metadata } from 'next'
import PortalStubPage from '@/components/manage/PortalStubPage'

export const metadata: Metadata = { title: 'Komisyon Faturaları' }

export default function Page() {
  return (
    <PortalStubPage
      title="Komisyon Faturaları"
      description="Kurumunuza ait komisyon faturalarını görüntüleyin."
      backPath="/manage/staff"
      backLabel="Personel paneli"
    />
  )
}