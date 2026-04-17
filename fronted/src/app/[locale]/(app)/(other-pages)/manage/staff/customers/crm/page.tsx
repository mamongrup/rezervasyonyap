import type { Metadata } from 'next'
import PortalStubPage from '@/components/manage/PortalStubPage'

export const metadata: Metadata = { title: 'Müşteri Notları (CRM)' }

export default function Page() {
  return (
    <PortalStubPage
      title="Müşteri Notları (CRM)"
      description="Müşterilere ait not ve etiket yönetimi."
      backPath="/manage/staff/customers"
      backLabel="Müşteri listesi"
    />
  )
}