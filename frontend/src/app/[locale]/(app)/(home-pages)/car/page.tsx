import { redirect } from 'next/navigation'

/** Eski `/car` URL — build sırasında statik üretim yerine yönlendirme. */
export const dynamic = 'force-dynamic'

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  redirect(`/${locale}/arac-kiralama/all`)
}
