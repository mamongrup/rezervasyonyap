import { vitrinHref } from '@/lib/vitrin-href'
import { redirect } from 'next/navigation'

/** Canlı destek (Tawk.to) → Ayarlar → Site kimliği sekmesinde yönetilir. */
export default async function LiveSupportRedirectPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const base = await vitrinHref(locale, '/manage/admin/settings')
  redirect(`${base}?tab=kimlik`)
}
