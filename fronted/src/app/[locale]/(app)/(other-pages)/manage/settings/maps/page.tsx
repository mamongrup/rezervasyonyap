import { vitrinHref } from '@/lib/vitrin-href'
import { redirect } from 'next/navigation'

/** Google Maps ayarları → Ayarlar → Google sekmesinde yönetilir. */
export default async function MapsSettingsRedirectPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const base = await vitrinHref(locale, '/manage/admin/settings')
  redirect(`${base}?tab=google`)
}
