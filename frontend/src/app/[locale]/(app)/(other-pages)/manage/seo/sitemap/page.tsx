import SeoSitemapSection from '@/components/manage/seo/SeoSitemapSection'
import { ManageAccessGuard } from '@/lib/use-manage-access'

export default function ManageSeoSitemapPage() {
  return (
    <ManageAccessGuard
      required={{ permissionsPrefixAny: ['admin.'], rolesAny: ['admin'] }}
      featureHint="admin.*"
    >
      <div className="px-4 py-6 md:px-6 lg:px-8">
        <h1 className="mb-6 text-xl font-semibold text-neutral-900 dark:text-white">Site haritası</h1>
        <SeoSitemapSection />
      </div>
    </ManageAccessGuard>
  )
}
