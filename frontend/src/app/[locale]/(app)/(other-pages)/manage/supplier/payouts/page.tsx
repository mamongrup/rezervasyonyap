import type { Metadata } from 'next'
import PortalStubPage from '@/components/manage/PortalStubPage'

export const metadata: Metadata = { title: 'Ödeme Talepleri' }

export default function Page() {
  return (
    <PortalStubPage
      title="Ödeme Talepleri"
      description="Kazancınızı banka hesabınıza aktarmak için ödeme talebi oluşturun."
      backPath="/manage/supplier"
      backLabel="Tedarikçi paneli"
    />
  )
}