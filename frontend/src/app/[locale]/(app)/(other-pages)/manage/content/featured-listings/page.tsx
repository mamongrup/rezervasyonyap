import { fetchCategoryListings } from '@/lib/listings-fetcher'
import FeaturedListingsClient from './FeaturedListingsClient'

const CATEGORY_LABELS: Record<string, string> = {
  oteller: 'Oteller',
  'tatil-evleri': 'Tatil Evleri',
  'yat-kiralama': 'Yat Kiralama',
  turlar: 'Turlar',
  aktiviteler: 'Aktiviteler',
}

const DEFAULT_CATEGORY = 'tatil-evleri'

/** Admin — kategori vitrininde öne çıkarılacak ilanları seç ve sırala */
export default async function FeaturedListingsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ category?: string }>
}) {
  const [{ locale }, { category: rawCategory }] = await Promise.all([params, searchParams])
  const categorySlug =
    rawCategory && CATEGORY_LABELS[rawCategory] ? rawCategory : DEFAULT_CATEGORY
  const { listings: allListings } = await fetchCategoryListings(
    categorySlug,
    {},
    {},
    locale || 'tr',
  )

  return (
    <div className="container py-10">
      <FeaturedListingsClient
        categorySlug={categorySlug}
        categoryLabel={CATEGORY_LABELS[categorySlug] ?? categorySlug}
        allListings={allListings}
      />
    </div>
  )
}
