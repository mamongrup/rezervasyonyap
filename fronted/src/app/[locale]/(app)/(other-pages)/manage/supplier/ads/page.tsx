import type { Metadata } from 'next'
import PortalStubPage from '@/components/manage/PortalStubPage'

export const metadata: Metadata = { title: 'Reklam & Tanıtım Bütçesi' }

export default function Page() {
  return (
    <PortalStubPage
      title="Reklam & Tanıtım Bütçesi"
      description="İlanlarınız için reklam bütçesi oluşturun, öne çıkarma talepleri gönderin."
      backPath="/manage/supplier"
      backLabel="Tedarikçi paneli"
    />
  )
}