import type { Metadata } from 'next'
import PortalStubPage from '@/components/manage/PortalStubPage'

export const metadata: Metadata = { title: 'Firma Profili' }

export default function Page() {
  return (
    <PortalStubPage
      title="Firma Profili"
      description="Şirket bilgileri, logo ve iletişim detaylarını buradan yönetin."
      backPath="/manage/supplier"
      backLabel="Tedarikçi paneli"
    />
  )
}