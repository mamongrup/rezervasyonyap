import { vitrinHref } from '@/lib/vitrin-href'
import { redirect } from 'next/navigation'

/** Denetim günlüğü → gerçek audit log AdminManageClient'ta embed edilmiştir. */
export default async function AuditLogRedirectPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const href = await vitrinHref(locale, '/manage/admin/manage')
  redirect(href)
}
