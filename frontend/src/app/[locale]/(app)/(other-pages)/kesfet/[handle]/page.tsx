import type { Metadata } from 'next'
import Link from 'next/link'
import {
  getCollectionBySlug,
  searchPublicListings,
  type ListingCollection,
  type CollectionFilterRules,
  type PublicListingItem,
} from '@/lib/travel-api'
import { ArrowLeft, SlidersHorizontal, Star, MapPin, Tag, Layers } from 'lucide-react'
import { notFound } from 'next/navigation'
import { vitrinHref } from '@/lib/vitrin-href'

interface Props {
  params: Promise<{ locale: string; handle: string }>
}

function parseRules(rulesJson: string): CollectionFilterRules {
  try { return JSON.parse(rulesJson) as CollectionFilterRules } catch { return {} }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { handle } = await params
  try {
    const { collection } = await getCollectionBySlug(handle)
    return {
      title: `${collection.title} — Koleksiyon`,
      description: collection.description ?? `${collection.title} koleksiyonundaki özel ilanlar`,
      openGraph: {
        title: collection.title,
        description: collection.description ?? undefined,
        images: collection.hero_image_url ? [collection.hero_image_url] : [],
      },
    }
  } catch {
    return { title: `${handle} — Koleksiyon` }
  }
}

// ─── Listing Card ─────────────────────────────────────────────────────────────
function ListingCard({ item }: { item: PublicListingItem }) {
  const img = item.featured_image_url ?? item.thumbnail_url
  const price = item.price_from ? parseFloat(item.price_from) : null

  return (
    <Link
      href={`/listing/${item.slug}`}
      className="group flex flex-col overflow-hidden rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 hover:shadow-lg transition-all hover:-translate-y-0.5"
    >
      {img ? (
        <div className="relative h-52 overflow-hidden">
          <img
            src={img}
            alt={item.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
          {item.discount_percent && (
            <span className="absolute top-3 left-3 px-2 py-1 rounded-lg bg-red-500 text-white text-xs font-bold">
              %{item.discount_percent} İndirim
            </span>
          )}
          {item.is_new && !item.discount_percent && (
            <span className="absolute top-3 left-3 px-2 py-1 rounded-lg bg-green-500 text-white text-xs font-bold">
              Yeni
            </span>
          )}
        </div>
      ) : (
        <div className="h-52 bg-gradient-to-br from-neutral-100 to-neutral-200 dark:from-neutral-800 dark:to-neutral-700 flex items-center justify-center">
          <Layers className="w-10 h-10 text-neutral-400" />
        </div>
      )}
      <div className="p-4 flex-1 flex flex-col gap-2">
        <div className="flex items-center gap-1.5 text-xs text-neutral-400">
          <Tag className="w-3 h-3" />
          <span className="capitalize">{item.category_code}</span>
          {item.location && (
            <>
              <span>·</span>
              <MapPin className="w-3 h-3" />
              <span>{item.location}</span>
            </>
          )}
        </div>
        <h3 className="font-semibold text-neutral-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors line-clamp-2">
          {item.title}
        </h3>
        <div className="mt-auto flex items-end justify-between pt-2 border-t border-neutral-100 dark:border-neutral-800">
          {price ? (
            <div>
              <span className="text-xs text-neutral-400">Başlangıç</span>
              <div className="font-bold text-neutral-900 dark:text-white">
                {new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 0 }).format(price)}{' '}
                <span className="text-sm font-normal">{item.currency_code}</span>
              </div>
            </div>
          ) : (
            <div className="text-sm text-neutral-400">Fiyat sorunuz</div>
          )}
          {item.review_avg && (
            <div className="flex items-center gap-1 text-sm font-medium text-amber-500">
              <Star className="w-4 h-4 fill-current" />
              {item.review_avg.toFixed(1)}
              {(item.review_count ?? 0) > 0 && (
                <span className="text-xs text-neutral-400 font-normal">({item.review_count ?? 0})</span>
              )}
            </div>
          )}
        </div>
      </div>
    </Link>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default async function CollectionPage({ params }: Props) {
  const { locale, handle } = await params

  let collection: ListingCollection | null = null
  let listings: PublicListingItem[] = []

  try {
    const colRes = await getCollectionBySlug(handle)
    collection = colRes.collection
  } catch {
    notFound()
  }

  if (!collection) notFound()

  const rules = parseRules(collection.filter_rules)

  // Fetch listings matching the collection rules
  const searchResult = await searchPublicListings({
    locale,
    location: rules.locations?.[0],
    categoryCode: rules.category_codes?.[0],
    perPage: 48,
  }).catch(() => null)

  listings = searchResult?.listings ?? []

  // Client-side keyword filter (for q-based collections)
  if (rules.q && listings.length > 0) {
    const qLow = rules.q.toLowerCase()
    const filtered = listings.filter(
      (l) =>
        l.title.toLowerCase().includes(qLow) ||
        (l.location ?? '').toLowerCase().includes(qLow),
    )
    if (filtered.length > 0) listings = filtered
  }

  const homeHref = await vitrinHref(locale, '/')

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      {/* Hero */}
      {collection.hero_image_url ? (
        <div className="relative w-full h-64 sm:h-80 overflow-hidden">
          <img
            src={collection.hero_image_url}
            alt={collection.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
            <div className="flex items-center gap-2 text-white/70 text-sm mb-2">
              <Layers className="w-4 h-4" />
              Koleksiyon
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-white">{collection.title}</h1>
            {collection.description && (
              <p className="text-white/80 mt-2 max-w-2xl">{collection.description}</p>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-gradient-to-br from-primary-600 to-primary-800 py-14 px-4">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center gap-2 text-primary-200 text-sm mb-2">
              <Layers className="w-4 h-4" />
              Koleksiyon
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-white">{collection.title}</h1>
            {collection.description && (
              <p className="text-primary-100 mt-2 max-w-2xl text-lg">{collection.description}</p>
            )}
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Breadcrumb */}
        <div className="flex items-center gap-3 mb-8">
          <Link
            href={homeHref}
            className="flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
          >
            <ArrowLeft className="w-4 h-4" />
            Ana Sayfa
          </Link>
          <span className="text-neutral-300 dark:text-neutral-600">/</span>
          <span className="text-sm text-neutral-700 dark:text-neutral-300 font-medium truncate">
            {collection.title}
          </span>
          <span className="ml-auto text-sm text-neutral-400">{listings.length} ilan</span>
        </div>

        {/* Active filters display */}
        {(rules.q || rules.category_codes?.length || rules.locations?.length) && (
          <div className="flex flex-wrap gap-2 mb-6">
            {rules.q && (
              <span className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 text-sm">
                <SlidersHorizontal className="w-3 h-3" />
                {rules.q}
              </span>
            )}
            {rules.category_codes?.map((c) => (
              <span key={c} className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 text-sm">
                <Tag className="w-3 h-3" />
                {c}
              </span>
            ))}
            {rules.locations?.map((l) => (
              <span key={l} className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 text-sm">
                <MapPin className="w-3 h-3" />
                {l}
              </span>
            ))}
          </div>
        )}

        {/* Listings grid */}
        {listings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
            <Layers className="w-16 h-16 text-neutral-300" />
            <h2 className="text-xl font-semibold text-neutral-700 dark:text-neutral-300">
              Bu koleksiyonda henüz ilan yok
            </h2>
            <p className="text-neutral-500 max-w-sm">
              Koleksiyon kriterleri çok yakında yeni ilanlarla güncellenecek.
            </p>
            <Link
              href={homeHref}
              className="mt-2 px-5 py-2.5 rounded-xl bg-primary-600 text-white hover:bg-primary-700 text-sm font-medium"
            >
              Ana Sayfaya Dön
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {listings.map((item) => (
              <ListingCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
