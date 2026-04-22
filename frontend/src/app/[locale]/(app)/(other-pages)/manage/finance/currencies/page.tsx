import { vitrinHref } from '@/lib/vitrin-href'
import { redirect } from 'next/navigation'

/** Para birimleri yönetimi — Tek yer: Ayarlar → Ödeme & kur (TCMB, sıra, POS ile birlikte). */
export default async function FinanceCurrenciesRedirectPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const base = await vitrinHref(locale, '/manage/admin/settings')
  redirect(`${base}?tab=operasyon`)
}
