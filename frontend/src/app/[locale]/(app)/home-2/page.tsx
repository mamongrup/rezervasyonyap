import { permanentRedirect } from 'next/navigation'

/**
 * Chisfis şablon demosu — Google sitelink’lerinde «Home 2» olarak görünüyordu.
 * Kalıcı yönlendirme + robots disallow ile indeksten düşürülür.
 */
export default async function Home2Redirect({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const dest = !locale || locale === 'tr' ? '/' : `/${locale}`
  permanentRedirect(dest)
}
