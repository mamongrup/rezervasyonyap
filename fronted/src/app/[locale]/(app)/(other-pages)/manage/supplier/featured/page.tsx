import type { Metadata } from 'next'
import PortalStubPage from '@/components/manage/PortalStubPage'

export const metadata: Metadata = { title: 'Öne Çıkarma Talepleri' }

export default function Page() {
  return (
    <PortalStubPage
      title="Öne Çıkarma Talepleri"
      description="İlanlarınızı anasayfa ve kategori sayfalarında öne çıkarın."
      backPath="/manage/supplier"
      backLabel="Tedarikçi paneli"
    />
  )
}