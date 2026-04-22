import type { Metadata } from 'next'
import PortalStubPage from '@/components/manage/PortalStubPage'

export const metadata: Metadata = { title: 'Ekip Üyeleri' }

export default function Page() {
  return (
    <PortalStubPage
      title="Ekip Üyeleri"
      description="Acentenize personel ekleyin, yetkileri düzenleyin."
      backPath="/manage/agency"
      backLabel="Acente paneli"
    />
  )
}