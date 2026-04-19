import { ManageAccessGuard } from '@/lib/use-manage-access'
import EarlyBookingCampaignsClient from '../EarlyBookingCampaignsClient'

export default function ManageEarlyBookingCampaignsPage() {
  return (
    <ManageAccessGuard
      required={{
        oneOf: [
          { permissionsAny: ['admin.users.read'] },
          { permissionsPrefixAny: ['admin.'], rolesAny: ['admin'] },
        ],
      }}
      featureHint="admin.users.read veya yönetici"
    >
      <div className="px-4 py-6 md:px-6 lg:px-8">
        <EarlyBookingCampaignsClient />
      </div>
    </ManageAccessGuard>
  )
}
