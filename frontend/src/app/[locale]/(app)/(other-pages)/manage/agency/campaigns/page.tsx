import type { Metadata } from 'next'
import PortalStubPage from '@/components/manage/PortalStubPage'

export const metadata: Metadata = { title: 'Kampanyalar & Kuponlar' }

export default function Page() {
  return (
    <PortalStubPage
      title="Kampanyalar & Kuponlar"
      description="Müşterilerinize özel kampanya ve kupon kodları oluşturun."
      backPath="/manage/agency"
      backLabel="Acente paneli"
    />
  )
}