'use client'

import { useManageT } from '@/lib/manage-i18n-context'
import { ManageAccessGuard } from '@/lib/use-manage-access'

export default function CatalogManageLayoutClient({ children }: { children: React.ReactNode }) {
  const t = useManageT()
  return (
    <ManageAccessGuard
      required={{
        oneOf: [
          { permissionsPrefixAny: ['admin.'] },
          { rolesAny: ['admin'] },
          { permissionsPrefixAny: ['staff.'] },
          { rolesAny: ['staff'] },
          { permissionsAny: ['supplier.portal'] },
          { rolesAny: ['supplier'] },
          { permissionsAny: ['agency.portal'] },
          { rolesAny: ['agency'] },
        ],
      }}
      featureHint={t('catalog.feature_hint')}
    >
      <div className="container mx-auto max-w-7xl px-4 py-6 sm:px-6">
        {children}
      </div>
    </ManageAccessGuard>
  )
}
