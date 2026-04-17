import SeoRedirectsSection from '@/components/manage/seo/SeoRedirectsSection'
import { ManageAccessGuard } from '@/lib/use-manage-access'

export default function ManageSeoRedirectsPage() {
  return (
    <ManageAccessGuard
      required={{ permissionsPrefixAny: ['admin.'], rolesAny: ['admin'] }}
      featureHint="admin.*"
    >
      <div className="px-4 py-6 md:px-6 lg:px-8">
        <h1 className="mb-6 text-xl font-semibold text-neutral-900 dark:text-white">301 yönlendirmeler</h1>
        <SeoRedirectsSection />
      </div>
    </ManageAccessGuard>
  )
}
