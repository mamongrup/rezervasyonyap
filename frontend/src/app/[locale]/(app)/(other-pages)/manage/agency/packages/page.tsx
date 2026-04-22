import type { Metadata } from 'next'
import PortalStubPage from '@/components/manage/PortalStubPage'

export const metadata: Metadata = { title: 'Paket Tatil' }

export default function Page() {
  return (
    <PortalStubPage
      title="Paket Tatil"
      description="Birden fazla ürünü bir araya getirerek paket tatil oluşturun."
      backPath="/manage/agency"
      backLabel="Acente paneli"
    />
  )
}