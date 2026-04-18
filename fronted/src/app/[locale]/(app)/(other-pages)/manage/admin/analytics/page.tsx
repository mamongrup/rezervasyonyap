import { vitrinHref } from '@/lib/vitrin-href'
import { redirect } from 'next/navigation'

/** Analitik & takip kodları → Ayarlar → Google sekmesinde yönetilir. */
export default async function AdminAnalyticsRedirectPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const base = await vitrinHref(locale, '/manage/admin/settings')
  redirect(`${base}?tab=google`)
}
