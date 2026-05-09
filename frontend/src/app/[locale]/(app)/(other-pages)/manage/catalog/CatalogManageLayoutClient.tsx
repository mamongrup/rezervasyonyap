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
      {/* Üst boşluk aynı; alt tarafı sıkı tut — site footer’ına fazla beyaz boşluk olmasın (sol menüye dokunmaz). */}
      <div className="container mx-auto max-w-7xl px-4 pt-6 pb-3 sm:px-6 sm:pb-4">
        {children}
      </div>
    </ManageAccessGuard>
  )
}
