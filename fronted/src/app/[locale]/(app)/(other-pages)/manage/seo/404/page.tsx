import SeoNotFoundLogsSection from '@/components/manage/seo/SeoNotFoundLogsSection'
import { ManageAccessGuard } from '@/lib/use-manage-access'

export default function ManageSeo404Page() {
  return (
    <ManageAccessGuard
      required={{ permissionsPrefixAny: ['admin.'], rolesAny: ['admin'] }}
      featureHint="admin.*"
    >
      <div className="px-4 py-6 md:px-6 lg:px-8">
        <h1 className="mb-6 text-xl font-semibold text-neutral-900 dark:text-white">404 yönetimi</h1>
        <SeoNotFoundLogsSection />
      </div>
    </ManageAccessGuard>
  )
}
