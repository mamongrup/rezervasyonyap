/** Header ilan adı autocomplete servisi. */
import { apiOriginForFetch } from '@/lib/api-origin'
import {
  categoryLabelForSearch,
  publicListingDetailPath,
  SEARCH_MIN_QUERY_LEN,
} from '@/lib/search-listings-display'
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

interface ListingSuggestionItem {
  id: string
  slug: string
  title: string
  category_code: string
  image: string | null
  location: string | null
}

export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get('q') ?? '').trim()
  const locale = (req.nextUrl.searchParams.get('locale') ?? 'tr').trim()
  const requestedLimit = Number(req.nextUrl.searchParams.get('limit') ?? '8')
  const limit = Number.isFinite(requestedLimit)
    ? Math.min(Math.max(Math.trunc(requestedLimit), 1), 20)
    : 8

  if (q.length < SEARCH_MIN_QUERY_LEN) {
    return NextResponse.json({ suggestions: [] })
  }

  const { getMessages } = await import('@/utils/getT')
  const categoryLabels = getMessages(locale).listing.browseCategory as Record<string, string>
  const apiBase = apiOriginForFetch() || (process.env.API_URL ?? '').replace(/\/$/, '')
  const suggestions: SearchSuggestion[] = []

  if (apiBase) {
    // Tam katalog endpoint'i fiyat, müsaitlik ve galeri hesapladığından autocomplete
    // için yalnızca gerekli altı alanı döndüren hafif endpoint'i kullanıyoruz.
    const response = await fetch(
      `${apiBase}/api/v1/catalog/public/listing-suggestions?q=${encodeURIComponent(q)}&locale=${encodeURIComponent(locale)}&limit=${limit}`,
      { next: { revalidate: 300 } },
    ).catch(() => null)

    if (response?.ok) {
      const data = (await response.json()) as { listings?: ListingSuggestionItem[] }
      const seen = new Set<string>()
      for (const item of data.listings ?? []) {
        if (seen.has(item.id)) continue
        seen.add(item.id)
        const categoryLabel = categoryLabelForSearch(item.category_code, categoryLabels)
        const rawImage = item.image?.trim()
        const image = rawImage
          ? /^https?:\/\//i.test(rawImage) || rawImage.startsWith('/')
            ? rawImage
            : `/${rawImage}`
          : undefined
        suggestions.push({
          type: 'listing',
          id: item.id,
          slug: item.slug,
          title: item.title,
          subtitle: [categoryLabel, item.location].filter(Boolean).join(' · ') || undefined,
          image,
          href: publicListingDetailPath(item.category_code, item.slug),
        })
      }
    }
  }

  return NextResponse.json(
    { suggestions: suggestions.slice(0, limit) },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      },
    },
  )
}
