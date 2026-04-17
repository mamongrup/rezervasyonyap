import type { Metadata } from 'next'
import PortalStubPage from '@/components/manage/PortalStubPage'

export const metadata: Metadata = { title: 'API Anahtarları' }

export default function Page() {
  return (
    <PortalStubPage
      title="API Anahtarları"
      description="Kendi sistemlerinizi entegre etmek için API anahtarı oluşturun."
      backPath="/manage/agency"
      backLabel="Acente paneli"
    />
  )
}