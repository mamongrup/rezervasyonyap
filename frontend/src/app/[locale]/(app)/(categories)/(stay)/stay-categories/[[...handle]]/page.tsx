import { vitrinHref } from '@/lib/vitrin-href'
import { redirect } from 'next/navigation'

export default async function Page({ params }: { params: Promise<{ locale: string; handle?: string[] }> }) {
  const { locale, handle } = await params
  const segment = handle?.[0]
  if (segment && segment !== 'all') {
    redirect(await vitrinHref(locale, `/oteller/${segment}`))
  }
  redirect(await vitrinHref(locale, '/oteller/all'))
}
