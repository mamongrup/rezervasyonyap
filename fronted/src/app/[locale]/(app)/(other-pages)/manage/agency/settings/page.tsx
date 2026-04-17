import type { Metadata } from 'next'
import PortalStubPage from '@/components/manage/PortalStubPage'

export const metadata: Metadata = { title: 'Hesap Ayarları' }

export default function Page() {
  return (
    <PortalStubPage
      title="Hesap Ayarları"
      description="Şifre, bildirim ve güvenlik ayarlarınızı güncelleyin."
      backPath="/manage/agency"
      backLabel="Acente paneli"
    />
  )
}