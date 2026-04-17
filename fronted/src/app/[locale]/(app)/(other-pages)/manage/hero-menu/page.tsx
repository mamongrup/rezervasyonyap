import { ManageAccessGuard } from '@/lib/use-manage-access'
import HeroMenuManageClient from './HeroMenuManageClient'

export default function ManageHeroMenuPage() {
  return (
    <ManageAccessGuard
      required={{
        oneOf: [{ permissionsAny: ['admin.users.read'] }, { rolesAny: ['admin'] }],
      }}
      featureHint="admin.users.read"
    >
      <HeroMenuManageClient />
    </ManageAccessGuard>
  )
}
