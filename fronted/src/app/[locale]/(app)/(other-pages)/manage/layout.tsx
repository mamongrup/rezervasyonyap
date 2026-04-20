import { ManageI18nProvider } from '@/lib/manage-i18n-context'
import ManageShellClient from './ManageShellClient'

export const dynamic = 'force-dynamic'

export default function ManageLayout({ children }: { children: React.ReactNode }) {
  return (
    <ManageI18nProvider>
      <ManageShellClient>{children}</ManageShellClient>
    </ManageI18nProvider>
  )
}
