import {
  searchPublicListings,
  listCollections,
  type PublicListingItem,
  type ListingCollection,
} from '@/lib/travel-api'
import { getMessages } from '@/utils/getT'
import Link from 'next/link'
import { Search, Star, MapPin, Tag, Layers, ArrowRight } from 'lucide-react'

interface Config {
  perPage?: number
}

interface Props {
  config: Config
  query: string
  categoryFilter?: string
  locale?: string
  page?: number
}

function ListingCard({ item, locale = 'tr' }: { item: PublicListingItem; locale?: string }) {
  const img = item.featured_image_url ?? item.thumbnail_url
  const price = item.price_from ? parseFloat(item.price_from) : null
  const m = getMessages(locale)

  const mealBadge =
    item.meal_plan_summary === 'meal_only' ? (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500 px-2 py-0.5 text-xs font-semibold text-white">
        🍽️ {m.listing.meal_only}
      </span>
    ) : item.meal_plan_summary === 'both' ? (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500 px-2 py-0.5 text-xs font-semibold text-white">
        🍽️ {m.listing.both}
      </span>
    ) : null

  return (
    <Link
      href={`/listing/${item.slug}`}
      className="group flex gap-4 rounded-2xl border border-neutral-200 bg-white p-4 transition-all hover:shadow-md dark:border-neutral-800 dark:bg-neutral-900"
    >
      {/* Görsel */}
      <div className="relative h-20 w-24 flex-shrink-0">
        {img ? (
          <img
            src={img}
            alt={item.title}
            className="h-full w-full rounded-xl object-cover transition-transform group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center rounded-xl bg-neutral-100 dark:bg-neutral-800">
            <Tag className="h-6 w-6 text-neutral-400" />
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="mb-1 flex flex-wrap items-center gap-1.5 text-xs text-neutral-400">
          <span className="capitalize">{item.category_code}</span>
          {item.location && (
            <>
              <span>·</span>
              <MapPin className="h-3 w-3" />
              <span>{item.location}</span>
            </>
          )}
          {mealBadge}
        </div>
        <h3 className="line-clamp-1 font-semibold text-neutral-900 transition-colors group-hover:text-primary-600 dark:text-white dark:group-hover:text-primary-400">
          {item.title}
        </h3>
        <div className="mt-2 flex items-center justify-between">
          {price ? (
            <span className="text-sm font-bold">
              {new Intl.NumberFormat(locale === 'en' ? 'en-US' : 'tr-TR', { minimumFractionDigits: 0 }).format(price)}{' '}
              {item.currency_code}
            </span>
          ) : (
            <span />
          )}
          {item.review_avg && (
            <span className="flex items-center gap-1 text-xs font-medium text-amber-500">
              <Star className="h-3 w-3 fill-current" />
              {item.review_avg.toFixed(1)}
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}

function CollectionCard({ col }: { col: ListingCollection }) {
  return (
    <Link
      href={`/kesfet/${col.slug}`}
      className="group flex items-center gap-4 rounded-2xl border border-primary-200 bg-gradient-to-r from-primary-50 to-primary-100 p-4 transition-all hover:shadow-md dark:border-primary-800 dark:from-primary-900/20 dark:to-primary-800/20"
    >
      {col.hero_image_url ? (
        <img
          src={col.hero_image_url}
          alt={col.title}
          className="h-14 w-16 flex-shrink-0 rounded-xl object-cover"
        />
      ) : (
        <div className="flex h-14 w-16 flex-shrink-0 items-center justify-center rounded-xl bg-primary-200 dark:bg-primary-900/50">
          <Layers className="h-6 w-6 text-primary-500" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center gap-1.5 text-xs text-primary-600 dark:text-primary-400">
          <Layers className="h-3 w-3" />
          Koleksiyon
        </div>
        <h3 className="line-clamp-1 font-semibold text-neutral-900 transition-colors group-hover:text-primary-600 dark:text-white">
          {col.title}
        </h3>
        {col.description && (
          <p className="mt-0.5 line-clamp-1 text-xs text-neutral-500">{col.description}</p>
        )}
      </div>
      <ArrowRight className="h-4 w-4 flex-shrink-0 text-primary-500 transition-transform group-hover:translate-x-1" />
    </Link>
  )
}

export default async function SearchResultsModule({ config, query, categoryFilter, locale = 'tr', page = 1 }: Props) {
  const perPage = config.perPage ?? 24
  const offset  = (page - 1) * perPage

  let listings: PublicListingItem[] = []
  let collections: ListingCollection[] = []
  let total = 0

  if (query) {
    const [listRes, colRes] = await Promise.allSettled([
      searchPublicListings({
        q: query,
        locale,
        page,
        perPage,
        ...(categoryFilter ? { categoryCode: categoryFilter } : {}),
      }),
      !categoryFilter ? listCollections() : Promise.resolve({ collections: [] }),
    ])

    if (listRes.status === 'fulfilled' && listRes.value) {
      total = listRes.value.total
      listings = listRes.value.listings
    }

    if (colRes.status === 'fulfilled') {
      const qLow = query.toLowerCase()
      collections = colRes.value.collections
        .filter(
          (c) =>
            c.title.toLowerCase().includes(qLow) ||
            (c.description ?? '').toLowerCase().includes(qLow),
        )
        .slice(0, 4)
    }
  }

  const resultTotal = listings.length + collections.length

  if (!query) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
        <Search className="h-12 w-12 text-neutral-300" />
        <h2 className="text-xl font-semibold text-neutral-700 dark:text-neutral-300">
          Ne aramak istersiniz?
        </h2>
        <p className="text-neutral-500">Üst menüdeki arama ikonuna tıklayarak başlayın.</p>
      </div>
    )
  }

  if (resultTotal === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
        <Search className="h-12 w-12 text-neutral-300" />
        <h2 className="text-xl font-semibold text-neutral-700 dark:text-neutral-300">
          &ldquo;{query}&rdquo; için sonuç bulunamadı
        </h2>
        <p className="max-w-sm text-neutral-500">
          Farklı kelimeler deneyin veya kategori filtresini kaldırın.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-10">
      {collections.length > 0 && (
        <section>
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-neutral-900 dark:text-white">
            <Layers className="h-5 w-5 text-primary-500" />
            Koleksiyonlar
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {collections.map((col) => (
              <CollectionCard key={col.id} col={col} />
            ))}
          </div>
        </section>
      )}

      {listings.length > 0 && (
        <section>
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-neutral-900 dark:text-white">
            <Tag className="h-5 w-5 text-primary-500" />
            İlanlar{total > 0 && ` (${total})`}
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {listings.map((item) => (
              <ListingCard key={item.id} item={item} locale={locale} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
