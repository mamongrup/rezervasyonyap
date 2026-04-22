import type { Metadata } from 'next'
import PortalStubPage from '@/components/manage/PortalStubPage'

export const metadata: Metadata = { title: 'Komisyon Takibi' }

export default function Page() {
  return (
    <PortalStubPage
      title="Komisyon Takibi"
      description="Kazanılan ve bekleyen komisyon tutarlarını takip edin."
      backPath="/manage/agency"
      backLabel="Acente paneli"
    />
  )
}