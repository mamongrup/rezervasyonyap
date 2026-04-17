import { ManageAccessGuard } from '@/lib/use-manage-access'
import SeoRichSnippetsClient from '../SeoRichSnippetsClient'

export default function ManageSeoRichSnippetsPage() {
  return (
    <ManageAccessGuard
      required={{ permissionsPrefixAny: ['admin.'], rolesAny: ['admin'] }}
      featureHint="admin.*"
    >
      <div className="px-4 py-6 md:px-6 lg:px-8">
        <SeoRichSnippetsClient />
      </div>
    </ManageAccessGuard>
  )
}
