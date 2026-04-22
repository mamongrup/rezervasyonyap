import type { Metadata } from 'next'
import PortalStubPage from '@/components/manage/PortalStubPage'

export const metadata: Metadata = { title: 'Tüm İlanlar' }

export default function Page() {
  return (
    <PortalStubPage
      title="Tüm İlanlar"
      description="Kurumunuza ait ilanlar. Slug veya UUID ile arama yapabilirsiniz."
      backPath="/manage/staff"
      backLabel="Personel paneli"
    />
  )
}