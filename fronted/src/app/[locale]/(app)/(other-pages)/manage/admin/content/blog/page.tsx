import { vitrinHref } from '@/lib/vitrin-href'
import { redirect } from 'next/navigation'

export default async function AdminBlogPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  redirect(await vitrinHref(locale, '/manage/content/blog'))
}
