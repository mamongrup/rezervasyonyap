import type { Metadata } from 'next'
import PortalStubPage from '@/components/manage/PortalStubPage'

export const metadata: Metadata = { title: 'Teklifler' }

export default function Page() {
  return (
    <PortalStubPage
      title="Teklifler"
      description="Müşterilerinize gönderilen teklif talepleri."
      backPath="/manage/agency"
      backLabel="Acente paneli"
    />
  )
}