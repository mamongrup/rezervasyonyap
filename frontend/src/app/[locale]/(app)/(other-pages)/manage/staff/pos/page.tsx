import type { Metadata } from 'next'
import PortalStubPage from '@/components/manage/PortalStubPage'

export const metadata: Metadata = { title: 'POS Satış Ekranı' }

export default function Page() {
  return (
    <PortalStubPage
      title="POS Satış Ekranı"
      description="Müşteri adına rezervasyon oluşturun ve ödeme alın."
      backPath="/manage/staff"
      backLabel="Personel paneli"
    />
  )
}