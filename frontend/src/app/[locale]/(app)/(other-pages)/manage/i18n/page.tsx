import { ManageAccessGuard } from '@/lib/use-manage-access'
import { Metadata } from 'next'
import I18nManageClient from './I18nManageClient'

export const metadata: Metadata = {
  title: 'Diller & çeviriler | Yönetim',
  description: 'Locale ekleme ve çeviri içe/dışa aktarma',
}

export default function ManageI18nPage() {
  return (
    <ManageAccessGuard
      required={{ permissionsPrefixAny: ['admin.'], rolesAny: ['admin'] }}
      featureHint="admin.*"
    >
      <I18nManageClient />
    </ManageAccessGuard>
  )
}

