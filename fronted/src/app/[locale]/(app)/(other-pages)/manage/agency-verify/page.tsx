import type { Metadata } from 'next'
import AgencyVerifyAdminClient from './AgencyVerifyAdminClient'

export const metadata: Metadata = {
  title: 'Acente TÜRSAB Doğrulama',
}

export default function Page() {
  return <AgencyVerifyAdminClient />
}
