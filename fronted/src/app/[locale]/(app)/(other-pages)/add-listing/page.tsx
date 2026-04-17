import { vitrinHref } from '@/lib/vitrin-href'
import { redirect } from 'next/navigation'

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  redirect(await vitrinHref(locale, '/add-listing/1'))
}
