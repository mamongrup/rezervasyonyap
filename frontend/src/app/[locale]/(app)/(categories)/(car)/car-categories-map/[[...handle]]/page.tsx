import { redirect } from 'next/navigation'

export default async function Page({ params }: { params: Promise<{ handle?: string[] }> }) {
  const { handle } = await params
  const segment = handle?.[0]
  if (segment && segment !== 'all') {
    redirect(`/arac-kiralama-harita/${segment}`)
  }
  redirect('/arac-kiralama-harita/all')
}
