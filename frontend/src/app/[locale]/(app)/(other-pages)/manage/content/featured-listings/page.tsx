import { filterListingsForFeaturedPicker } from '@/lib/featured-listings-utils'
import { fetchCategoryListings } from '@/lib/listings-fetcher'
import FeaturedListingsClient from './FeaturedListingsClient'

const CATEGORY_LABELS: Record<string, string> = {
  oteller: 'Oteller',
  'tatil-evleri': 'Tatil Evleri',
  'yat-kiralama': 'Yat Kiralama',
  turlar: 'Turlar',
  aktiviteler: 'Aktiviteler',
  feribot: 'Feribot',
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
  const { listings: rawListings, total: rawTotal } = await fetchCategoryListings(
    categorySlug,
    {},
    { perPage: 100 },
    locale || 'tr',
  )
  const allListings = filterListingsForFeaturedPicker(rawListings)
  const total = rawTotal - (rawListings.length - allListings.length)

  return (
    <div className="container py-10">
      <FeaturedListingsClient
        categorySlug={categorySlug}
        categoryLabel={CATEGORY_LABELS[categorySlug] ?? categorySlug}
        locale={locale || 'tr'}
        allListings={allListings}
        totalListings={total}
      />
    </div>
  )
}
