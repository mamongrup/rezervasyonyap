import type { Metadata } from 'next'
import PortalStubPage from '@/components/manage/PortalStubPage'

export const metadata: Metadata = { title: 'Fiyat Kuralları' }

export default function Page() {
  return (
    <PortalStubPage
      title="Fiyat Kuralları"
      description="Sezonsal fiyat ve dönemsel kural tanımlamalarını yönetin."
      backPath="/manage/supplier"
      backLabel="Tedarikçi paneli"
    />
  )
}