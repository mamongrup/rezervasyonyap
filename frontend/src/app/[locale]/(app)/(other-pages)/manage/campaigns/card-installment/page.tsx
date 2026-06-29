import { ManageAccessGuard } from '@/lib/use-manage-access'
import CardInstallmentCampaignClient from './CardInstallmentCampaignClient'

export default function ManageCardInstallmentCampaignPage() {
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
        <CardInstallmentCampaignClient />
      </div>
    </ManageAccessGuard>
  )
}
