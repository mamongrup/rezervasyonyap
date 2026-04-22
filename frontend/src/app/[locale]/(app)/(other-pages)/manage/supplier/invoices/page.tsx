import type { Metadata } from 'next'
import PortalStubPage from '@/components/manage/PortalStubPage'

export const metadata: Metadata = { title: 'Komisyon Faturaları' }

export default function Page() {
  return (
    <PortalStubPage
      title="Komisyon Faturaları"
      description="Platformun kestiği komisyon faturalarını görüntüleyin ve indirin."
      backPath="/manage/supplier"
      backLabel="Tedarikçi paneli"
    />
  )
}