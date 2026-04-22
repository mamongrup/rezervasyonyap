import { vitrinHref } from '@/lib/vitrin-href'
import { redirect } from 'next/navigation'

/** admin/settings/general → admin/settings (GeneralSettingsClient her ikisinde de aynı) */
export default async function AdminSettingsGeneralRedirectPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const href = await vitrinHref(locale, '/manage/admin/settings')
  redirect(href)
}
