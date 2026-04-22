import type { Metadata } from 'next'
import PortalStubPage from '@/components/manage/PortalStubPage'

export const metadata: Metadata = { title: 'Belgeler & Dosyalar' }

export default function Page() {
  return (
    <PortalStubPage
      title="Belgeler & Dosyalar"
      description="Paylaşılan belgeler ve dosyalar."
      backPath="/manage/staff"
      backLabel="Personel paneli"
    />
  )
}