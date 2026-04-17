import type { Metadata } from 'next'
import PortalStubPage from '@/components/manage/PortalStubPage'

export const metadata: Metadata = { title: 'Bildirim Tercihleri' }

export default function Page() {
  return (
    <PortalStubPage
      title="Bildirim Tercihleri"
      description="E-posta ve SMS bildirim tercihlerinizi özelleştirin."
      backPath="/manage/staff"
      backLabel="Personel paneli"
    />
  )
}