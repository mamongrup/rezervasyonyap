import CmsPagesClient from './CmsPagesClient'
import { ManageAccessGuard } from '@/lib/use-manage-access'

export default function Page() {
  return (
    <ManageAccessGuard
      required={{ permissionsPrefixAny: ['admin.'], rolesAny: ['admin'] }}
      featureHint="admin.*"
    >
      <CmsPagesClient />
    </ManageAccessGuard>
  )
}
