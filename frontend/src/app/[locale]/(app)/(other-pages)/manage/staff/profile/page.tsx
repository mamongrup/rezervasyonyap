import type { Metadata } from 'next'
import PortalStubPage from '@/components/manage/PortalStubPage'

export const metadata: Metadata = { title: 'Kurum Bilgileri' }

export default function Page() {
  return (
    <PortalStubPage
      title="Kurum Bilgileri"
      description="Bağlı olduğunuz kurumun bilgilerini görüntüleyin."
      backPath="/manage/staff"
      backLabel="Personel paneli"
    />
  )
}