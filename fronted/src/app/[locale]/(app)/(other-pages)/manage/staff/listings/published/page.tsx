import type { Metadata } from 'next'
import PortalStubPage from '@/components/manage/PortalStubPage'

export const metadata: Metadata = { title: 'Yayındaki İlanlar' }

export default function Page() {
  return (
    <PortalStubPage
      title="Yayındaki İlanlar"
      description="Aktif ve satışa açık ilanları listeler."
      backPath="/manage/staff/listings"
      backLabel="Tüm ilanlar"
    />
  )
}