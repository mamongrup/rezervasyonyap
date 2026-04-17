import type { Metadata } from 'next'
import PortalStubPage from '@/components/manage/PortalStubPage'

export const metadata: Metadata = { title: 'Sözleşmeler' }

export default function Page() {
  return (
    <PortalStubPage
      title="Sözleşmeler"
      description="Kurumunuza ait sözleşmeler ve belgeler."
      backPath="/manage/staff"
      backLabel="Personel paneli"
    />
  )
}