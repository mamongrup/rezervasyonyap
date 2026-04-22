import type { Metadata } from 'next'
import PortalStubPage from '@/components/manage/PortalStubPage'

export const metadata: Metadata = { title: 'Cüzdan & Bakiye' }

export default function Page() {
  return (
    <PortalStubPage
      title="Cüzdan & Bakiye"
      description="Komisyon bakiyenizi görün, para çekme talebi oluşturun."
      backPath="/manage/agency"
      backLabel="Acente paneli"
    />
  )
}