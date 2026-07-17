/**
 * /api/listing-search?q=balayı+villa&locale=tr&limit=8
 *
 * İlan başlığına + koleksiyonlara göre autocomplete sonuçları döner.
 */
import { apiOriginForFetch } from '@/lib/api-origin'
import {
  categoryLabelForSearch,
  dedupeSearchListings,
  publicListingDetailPath,
  SEARCH_MIN_QUERY_LEN,
} from '@/lib/search-listings-display'
import type { PublicListingItem } from '@/lib/travel-api'
import { NextRequest, NextResponse } from 'next/server'

export interface SearchSuggestion {
  type: 'listing' | 'collection'
  id: string
  slug: string
  title: string
  subtitle?: string
  image?: string
  href: string
}

export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get('q') ?? '').trim()
  const locale = (req.nextUrl.searchParams.get('locale') ?? 'tr').trim()
  const limit = Math.min(Number(req.nextUrl.searchParams.get('limit') ?? '8'), 20)

  if (q.length < SEARCH_MIN_QUERY_LEN) {
    return NextResponse.json({ suggestions: [] })
  }

  const { getMessages } = await import('@/utils/getT')
  const categoryLabels = getMessages(locale).listing.browseCategory as Record<string, string>

  const apiBase =
    apiOriginForFetch() || (process.env.API_URL ?? '').replace(/\/$/, '')

  const suggestions: SearchSuggestion[] = []

  if (apiBase) {
    await Promise.allSettled([
      // İlan araması
      fetch(
        `${apiBase}/api/v1/catalog/public/listings?q=${encodeURIComponent(q)}&locale=${locale}&limit=${limit}`,
        { next: { revalidate: 300 } },
      )
        .then((r) => r.json())
        .then((data: { listings?: PublicListingItem[] }) => {
          const deduped = dedupeSearchListings(data.listings ?? [])
          for (const item of deduped) {
            const catLabel = categoryLabelForSearch(item.category_code, categoryLabels)
            suggestions.push({
              type: 'listing',
              id: item.id,
              slug: item.slug,
              title: item.title,
              subtitle: [catLabel, item.location].filter(Boolean).join(' · ') || undefined,
              image: item.featured_image_url ?? item.thumbnail_url ?? undefined,
              href: publicListingDetailPath(item.category_code, item.slug),
            })
          }
        })
        .catch(() => undefined),

      // Koleksiyon araması
      fetch(`${apiBase}/api/v1/collections`, { next: { revalidate: 300 } })
        .then((r) => r.json())
        .then((data: { collections?: { id: string; slug: string; title: string; description: string | null; hero_image_url: string | null }[] }) => {
          const qLow = q.toLowerCase()
          for (const col of data.collections ?? []) {
            if (col.title.toLowerCase().includes(qLow) || (col.description ?? '').toLowerCase().includes(qLow)) {
              suggestions.push({
                type: 'collection',
                id: col.id,
                slug: col.slug,
                title: col.title,
                subtitle: col.description?.slice(0, 60) ?? 'Koleksiyon',
                image: col.hero_image_url ?? undefined,
                href: `/kesfet/${col.slug}`,
              })
            }
          }
        })
        .catch(() => undefined),
    ])
  }

  return NextResponse.json(
    { suggestions: suggestions.slice(0, limit) },
    {
      headers: {
        // Aynı popüler sorguları her kullanıcı için yeniden ağır katalog aramasına sokma.
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=300',
      },
    },
  )
}
