import { ManageAccessGuard } from '@/lib/use-manage-access'
import OperationsCenterClient from './OperationsCenterClient'

export default function OperationsCenterPage() {
  return (
    <ManageAccessGuard
      required={{ permissionsPrefixAny: ['admin.'], rolesAny: ['admin'] }}
      featureHint="admin.*"
    >
      <OperationsCenterClient />
    </ManageAccessGuard>
  )
}
