import type { Metadata } from 'next'
import PortalStubPage from '@/components/manage/PortalStubPage'

export const metadata: Metadata = { title: 'Hesap Ayarları' }

export default function Page() {
  return (
    <PortalStubPage
      title="Hesap Ayarları"
      description="Şifre ve bildirim ayarlarınızı güncelleyin."
      backPath="/manage/staff"
      backLabel="Personel paneli"
    />
  )
}