import { getStayListings } from '@/data/listings'
import FeaturedRegionsClient from './FeaturedRegionsClient'

/** Admin panel — her sayfa için "Bölgeye Göre Öne Çıkar" yapılandırması */
export default async function FeaturedRegionsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ page?: string }>
}) {
  const [{ locale: _locale }, { page: pageKey = 'homepage' }] = await Promise.all([params, searchParams])
  const allListings = await getStayListings()

  // Mevcut tüm şehirleri çıkar
  const cityCounts: Record<string, number> = {}
  for (const l of allListings) {
    const city = l.city
    if (city) cityCounts[city] = (cityCounts[city] ?? 0) + 1
  }
  const availableCities = Object.entries(cityCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([city]) => city)

  const PAGE_LABELS: Record<string, string> = {
    homepage: 'Ana Sayfa',
    oteller: 'Oteller',
    'tatil-evleri': 'Tatil Evleri',
    'yat-kiralama': 'Yat Kiralama',
  }

  return (
    <div className="container py-10">
      <FeaturedRegionsClient
        pageKey={pageKey}
        pageLabel={PAGE_LABELS[pageKey] ?? pageKey}
        allListings={allListings}
        availableCities={availableCities}
      />
    </div>
  )
}
