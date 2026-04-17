import type { Metadata } from 'next'
import PortalStubPage from '@/components/manage/PortalStubPage'

export const metadata: Metadata = { title: 'Faturalar' }

export default function Page() {
  return (
    <PortalStubPage
      title="Faturalar"
      description="Komisyon ve satış faturalarınızı görüntüleyin."
      backPath="/manage/agency"
      backLabel="Acente paneli"
    />
  )
}