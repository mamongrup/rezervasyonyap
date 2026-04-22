import type { Metadata } from 'next'
import PortalStubPage from '@/components/manage/PortalStubPage'

export const metadata: Metadata = { title: 'Taslak İlanlar' }

export default function Page() {
  return (
    <PortalStubPage
      title="Taslak İlanlar"
      description="Henüz yayınlanmamış ve taslak durumundaki ilanlar."
      backPath="/manage/staff/listings"
      backLabel="Tüm ilanlar"
    />
  )
}