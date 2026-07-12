import { ManageAccessGuard } from '@/lib/use-manage-access'
import AiApprovalQueueClient from './AiApprovalQueueClient'

export default function AiApprovalQueuePage() {
  return (
    <ManageAccessGuard required={{ permissionsPrefixAny: ['admin.'], rolesAny: ['admin'] }} featureHint="admin.*">
      <AiApprovalQueueClient />
    </ManageAccessGuard>
  )
}
