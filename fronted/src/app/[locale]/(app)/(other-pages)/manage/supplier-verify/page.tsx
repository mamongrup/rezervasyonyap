import type { Metadata } from 'next'
import SupplierVerifyAdminClient from './SupplierVerifyAdminClient'

export const metadata: Metadata = {
  title: 'Tedarikçi Firma Doğrulama',
}

export default function Page() {
  return <SupplierVerifyAdminClient />
}
