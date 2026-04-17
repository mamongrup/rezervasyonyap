import type { Metadata } from 'next'
import PortalStubPage from '@/components/manage/PortalStubPage'

export const metadata: Metadata = { title: 'Webhook Ayarları' }

export default function Page() {
  return (
    <PortalStubPage
      title="Webhook Ayarları"
      description="Rezervasyon ve ödeme olayları için webhook URL tanımlayın."
      backPath="/manage/agency"
      backLabel="Acente paneli"
    />
  )
}