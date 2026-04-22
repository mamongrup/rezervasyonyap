import { vitrinHref } from '@/lib/vitrin-href'
import { redirect } from 'next/navigation'

export default async function AdminManageRedirectPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  redirect(await vitrinHref(locale, '/manage/admin'))
}
