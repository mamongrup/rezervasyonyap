import type { Metadata } from 'next'
import PortalStubPage from '@/components/manage/PortalStubPage'

export const metadata: Metadata = { title: 'Satış Raporları' }

export default function Page() {
  return (
    <PortalStubPage
      title="Satış Raporları"
      description="Dönemsel satış ve komisyon raporları."
      backPath="/manage/staff"
      backLabel="Personel paneli"
    />
  )
}