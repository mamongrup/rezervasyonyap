import { ManageAccessGuard } from '@/lib/use-manage-access'
import AiControlCenterClient from './AiControlCenterClient'
export default function Page(){return <ManageAccessGuard required={{permissionsPrefixAny:['admin.'],rolesAny:['admin']}} featureHint="admin.*"><AiControlCenterClient/></ManageAccessGuard>}
