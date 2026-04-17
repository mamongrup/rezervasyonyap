import { ManageAccessGuard } from '@/lib/use-manage-access'
import SeoOverviewClient from './SeoOverviewClient'

export default function ManageSeoOverviewPage() {
  return (
    <ManageAccessGuard
      required={{ permissionsPrefixAny: ['admin.'], rolesAny: ['admin'] }}
      featureHint="admin.*"
    >
      <div className="px-4 py-6 md:px-6 lg:px-8">
        <SeoOverviewClient />
      </div>
    </ManageAccessGuard>
  )
}
