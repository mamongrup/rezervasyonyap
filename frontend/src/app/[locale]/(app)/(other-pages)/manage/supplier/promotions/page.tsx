import type { Metadata } from 'next'
import PortalStubPage from '@/components/manage/PortalStubPage'

export const metadata: Metadata = { title: 'Kampanyalar & İndirimler' }

export default function Page() {
  return (
    <PortalStubPage
      title="Kampanyalar & İndirimler"
      description="Erken rezervasyon, son dakika gibi kampanyalar oluşturun."
      backPath="/manage/supplier"
      backLabel="Tedarikçi paneli"
    />
  )
}