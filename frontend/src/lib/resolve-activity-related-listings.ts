import { detailPathForVertical } from '@/lib/listing-detail-routes'
import { mapPublicListingItemToListingBase } from '@/lib/listings-fetcher'
import { normalizeStayLocationPin } from '@/lib/stay-location-display'
import { searchPublicListings, type PublicListingItem } from '@/lib/travel-api'
import type { TListingBase } from '@/types/listing-types'

export type ActivityRelatedCard = {
  id: string
  title: string
  handle: string
  address: string
  price: string
  priceAmount?: number
  priceAmountMax?: number
  priceCurrency?: string
  reviewStart: number
  reviewCount: number
  featuredImage: string
  listingCategory: string
  linkBase: string
}

function mapToCard(item: TListingBase, linkBase: string): ActivityRelatedCard {
  return {
    id: item.id,
    title: item.title,
    handle: item.handle,
    address: item.address ?? item.city ?? '',
    price: item.price ?? '',
    priceAmount: item.priceAmount,
    priceAmountMax: item.priceAmountMax,
    priceCurrency: item.priceCurrency,
    reviewStart: item.reviewStart ?? 0,
    reviewCount: item.reviewCount ?? 0,
    featuredImage: item.featuredImage ?? '',
    listingCategory: item.listingCategory ?? '',
    linkBase,
  }
}

async function fetchListingsByIds(ids: string[], locale: string): Promise<TListingBase[]> {
  if (ids.length === 0) return []
  const res = await searchPublicListings(
    { listingIds: ids, categoryCode: 'activity', perPage: Math.min(ids.length, 20), locale },
    { cache: 'no-store' },
  )
  const byId = new Map<string, TListingBase>()
  for (const item of res?.listings ?? []) {
    byId.set(item.id, mapPublicListingItemToListingBase(item, { locale }))
  }
  return ids.map((id) => byId.get(id)).filter((x): x is TListingBase => x != null)
}

function autoSimilarPool(
  candidates: TListingBase[],
  opts: {
    excludeHandle: string
    excludeIds: Set<string>
    listingCategory?: string
    regionKey?: string
    mode: 'similar' | 'region'
  },
): TListingBase[] {
  const filtered = candidates.filter((l) => {
    if (l.handle === opts.excludeHandle) return false
    if (opts.excludeIds.has(l.id)) return false
    if (opts.mode === 'similar' && opts.listingCategory?.trim()) {
      return l.listingCategory === opts.listingCategory
    }
    if (opts.mode === 'region' && opts.regionKey) {
      const pin = normalizeStayLocationPin(l.city ?? l.address ?? '').toLocaleLowerCase('tr')
      return pin.includes(opts.regionKey)
    }
    return opts.mode === 'similar'
  })
  if (opts.mode === 'similar' && opts.listingCategory?.trim() && filtered.length === 0) {
    return candidates.filter(
      (l) => l.handle !== opts.excludeHandle && !opts.excludeIds.has(l.id),
    )
  }
  return filtered
}

export async function resolveActivityRelatedListings(input: {
  locale: string
  excludeHandle: string
  manualIds?: string[]
  autoCandidates: TListingBase[]
  listingCategory?: string
  regionPin?: string
  mode: 'similar' | 'region'
  limit?: number
}): Promise<ActivityRelatedCard[]> {
  const limit = input.limit ?? 8
  const linkBase = detailPathForVertical('activity')
  const regionKey = input.regionPin?.split(',')[0]?.trim().toLocaleLowerCase('tr') ?? ''
  const manualIds = (input.manualIds ?? []).slice(0, limit)

  const manualRows = await fetchListingsByIds(manualIds, input.locale)
  const pickedIds = new Set(manualRows.map((r) => r.id))

  const autoPool = autoSimilarPool(input.autoCandidates, {
    excludeHandle: input.excludeHandle,
    excludeIds: pickedIds,
    listingCategory: input.listingCategory,
    regionKey: input.mode === 'region' ? regionKey : undefined,
    mode: input.mode,
  })

  const merged = [...manualRows]
  for (const row of autoPool) {
    if (merged.length >= limit) break
    if (pickedIds.has(row.id)) continue
    pickedIds.add(row.id)
    merged.push(row)
  }

  return merged.slice(0, limit).map((row) => mapToCard(row, linkBase))
}

/** Admin arama — aktivite ilanı seçici */
export async function searchActivityListingsForPicker(
  query: string,
  locale: string,
  excludeListingId?: string,
): Promise<PublicListingItem[]> {
  const q = query.trim()
  if (q.length < 2) return []
  const res = await searchPublicListings(
    { q, categoryCode: 'activity', perPage: 12, locale },
    { cache: 'no-store' },
  )
  return (res?.listings ?? []).filter((l) => l.id !== excludeListingId)
}
