/**
 * /api/listing-search?q=balayı+villa&locale=tr&limit=8
 *
 * İlan başlığı + konum + koleksiyon autocomplete.
 * Backend `suggest=1`: tam sayım yok, görsel/fiyat kapısı yok → hızlı öneri.
 */
import { apiOriginForFetch } from '@/lib/api-origin'
import { resolveListingDisplayImageUrl } from '@/lib/listing-ext-image-proxy'
import {
  categoryLabelForSearch,
  dedupeSearchListings,
  publicListingDetailPath,
  rankSearchListings,
  SEARCH_MIN_QUERY_LEN,
  searchCategoryLabelsFromMessages,
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

type CollectionRow = {
  id: string
  slug: string
  title: string
  description: string | null
  hero_image_url: string | null
}

/** Koleksiyon listesi nadiren değişir — process içinde cache (her tuşta 200 satır çekme). */
let collectionsCache: { at: number; rows: CollectionRow[] } | null = null
const COLLECTIONS_TTL_MS = 5 * 60 * 1000

/** Locale mesajları da tuş başına yüklenmesin. */
const categoryLabelsCache = new Map<string, Record<string, string>>()

async function loadCollections(apiBase: string, signal?: AbortSignal): Promise<CollectionRow[]> {
  const now = Date.now()
  if (collectionsCache && now - collectionsCache.at < COLLECTIONS_TTL_MS) {
    return collectionsCache.rows
  }
  try {
    const res = await fetch(`${apiBase}/api/v1/collections`, {
      signal,
      next: { revalidate: 300 },
    })
    if (!res.ok) return collectionsCache?.rows ?? []
    const data = (await res.json()) as { collections?: CollectionRow[] }
    const rows = data.collections ?? []
    collectionsCache = { at: now, rows }
    return rows
  } catch {
    return collectionsCache?.rows ?? []
  }
}

async function loadCategoryLabels(locale: string): Promise<Record<string, string>> {
  const cached = categoryLabelsCache.get(locale)
  if (cached) return cached
  const { getMessages } = await import('@/utils/getT')
  const labels = searchCategoryLabelsFromMessages(getMessages(locale))
  categoryLabelsCache.set(locale, labels)
  return labels
}

function suggestionImage(raw: string | null | undefined): string | undefined {
  const resolved = resolveListingDisplayImageUrl(raw)
  return resolved || undefined
}

export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get('q') ?? '').trim()
  const locale = (req.nextUrl.searchParams.get('locale') ?? 'tr').trim()
  const categoryCode = (req.nextUrl.searchParams.get('category_code') ?? '').trim()
  const limit = Math.min(Number(req.nextUrl.searchParams.get('limit') ?? '8'), 20)

  if (q.length < SEARCH_MIN_QUERY_LEN) {
    return NextResponse.json({ suggestions: [] })
  }

  const apiBase =
    apiOriginForFetch() || (process.env.API_URL ?? '').replace(/\/$/, '')

  const suggestions: SearchSuggestion[] = []
  const signal = req.signal

  if (apiBase) {
    // Backend'in ilk birkaç satırdaki kaba sıralaması frontend'in kelime/konum
    // puanlamasını aç bırakmasın. Yanıt yine `limit` kadar; yalnız aday havuzu geniş.
    const candidateLimit = Math.min(Math.max(limit * 6, 48), 100)
    const listingsUrl =
      `${apiBase}/api/v1/catalog/public/listings` +
      `?q=${encodeURIComponent(q)}&locale=${encodeURIComponent(locale)}` +
      `&limit=${candidateLimit}&suggest=1` +
      (categoryCode ? `&category_code=${encodeURIComponent(categoryCode)}` : '')

    const [listingsSettled, collections, categoryLabels] = await Promise.all([
      fetch(listingsUrl, { signal, next: { revalidate: 60 } })
        .then(async (r) => {
          if (!r.ok) return [] as PublicListingItem[]
          const data = (await r.json()) as { listings?: PublicListingItem[] }
          return data.listings ?? []
        })
        .catch(() => [] as PublicListingItem[]),
      loadCollections(apiBase, signal),
      loadCategoryLabels(locale),
    ])

    const deduped = rankSearchListings(dedupeSearchListings(listingsSettled), q)
    for (const item of deduped) {
      const catLabel = categoryLabelForSearch(item.category_code, categoryLabels)
      suggestions.push({
        type: 'listing',
        id: item.id,
        slug: item.slug,
        title: item.title,
        subtitle: [catLabel, item.location].filter(Boolean).join(' · ') || undefined,
        image: suggestionImage(item.featured_image_url ?? item.thumbnail_url),
        href: publicListingDetailPath(item.category_code, item.slug),
      })
    }

    const qLow = q.toLowerCase()
    for (const col of collections) {
      if (
        col.title.toLowerCase().includes(qLow) ||
        (col.description ?? '').toLowerCase().includes(qLow)
      ) {
        suggestions.push({
          type: 'collection',
          id: col.id,
          slug: col.slug,
          title: col.title,
          subtitle: col.description?.slice(0, 60) || undefined,
          image: suggestionImage(col.hero_image_url),
          href: `/kesfet/${col.slug}`,
        })
      }
    }
  }

  // İlanları koleksiyonların önüne al (önce ürün, sonra keşfet).
  suggestions.sort((a, b) => {
    if (a.type === b.type) return 0
    return a.type === 'listing' ? -1 : 1
  })

  return NextResponse.json(
    { suggestions: suggestions.slice(0, limit) },
    {
      headers: {
        // Suggest sonuçları kısa süre CDN/edge + tarayıcı cache — geri silip yeniden
        // yazınca (aynı sorgu) ağ beklemeden anında dolsun.
        // Boş sonuç geçici backend/DB hatası da olabilir; boş yanıt cache'lenmez.
        'Cache-Control': suggestions.length > 0
          ? 'public, max-age=60, s-maxage=90, stale-while-revalidate=300'
          : 'no-store',
      },
    },
  )
}
