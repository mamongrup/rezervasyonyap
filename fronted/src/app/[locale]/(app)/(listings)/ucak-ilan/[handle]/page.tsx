import { vitrinHref } from '@/lib/vitrin-href'
import { redirect } from 'next/navigation'

/** Uçuş ilan detayı şablonu henüz yok — kategori sayfasına yönlendir */
export default async function Page({ params }: { params: Promise<{ locale: string; handle: string }> }) {
  const { locale } = await params
  redirect(await vitrinHref(locale, '/ucak-bileti/all'))
}
