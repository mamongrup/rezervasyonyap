import type { Metadata } from 'next'
import PortalStubPage from '@/components/manage/PortalStubPage'

export const metadata: Metadata = { title: 'Teklifler' }

export default function Page() {
  return (
    <PortalStubPage
      title="Teklifler"
      description="Ön rezervasyon ve teklif talepleri."
      backPath="/manage/staff"
      backLabel="Personel paneli"
    />
  )
}