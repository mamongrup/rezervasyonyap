import { ManageAccessGuard } from '@/lib/use-manage-access'
import FinanceReportsClient from './FinanceReportsClient'

export default function FinanceReportsPage() {
  return (
    <ManageAccessGuard
      required={{ permissionsPrefixAny: ['admin.'], rolesAny: ['admin'] }}
      featureHint="admin.*"
    >
      <div className="px-4 py-6 md:px-6 lg:px-8">
        <FinanceReportsClient />
      </div>
    </ManageAccessGuard>
  )
}
