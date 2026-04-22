import type { Metadata } from 'next'
import PortalStubPage from '@/components/manage/PortalStubPage'

export const metadata: Metadata = { title: 'POS İşlem Geçmişi' }

export default function Page() {
  return (
    <PortalStubPage
      title="POS İşlem Geçmişi"
      description="Kasa üzerinden yapılan tüm satış işlemlerini görüntüleyin."
      backPath="/manage/staff/pos"
      backLabel="POS ekranı"
    />
  )
}