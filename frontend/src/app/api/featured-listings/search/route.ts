import { NextRequest, NextResponse } from 'next/server'
import { requireAdminCookie } from '@/lib/api-require-admin'
import {
  expandListingSearchQueries,
  filterListingsForFeaturedPicker,
  safeCategorySlug,
} from '@/lib/featured-listings-utils'
import { fetchCategoryListings } from '@/lib/listings-fetcher'
import type { TListingBase } from '@/types/listing-types'

/** Admin vitrin seçici — kategori genelinde başlık/slug araması (API üst sınırı 100) */
export async function GET(req: NextRequest) {
  const authErr = await requireAdminCookie()
  if (authErr) return authErr

  const categorySlug = safeCategorySlug(req.nextUrl.searchParams.get('category'))
  if (!categorySlug) {
    return NextResponse.json({ error: 'category param required' }, { status: 400 })
  }

  const q = req.nextUrl.searchParams.get('q')?.trim() ?? ''
  const locale = req.nextUrl.searchParams.get('locale')?.trim() || 'tr'

  const variants = q ? expandListingSearchQueries(q) : []
  const merged = new Map<string, TListingBase>()
  let apiTotal = 0

  if (variants.length === 0) {
    const result = await fetchCategoryListings(categorySlug, {}, { perPage: 100 }, locale)
    apiTotal = result.total
    for (const listing of result.listings) merged.set(listing.id, listing)
  } else {
    for (const variant of variants) {
      const result = await fetchCategoryListings(
        categorySlug,
        { q: variant },
        { perPage: 100 },
        locale,
      )
      apiTotal = Math.max(apiTotal, result.total)
      for (const listing of result.listings) merged.set(listing.id, listing)
    }
  }

  const listings = filterListingsForFeaturedPicker([...merged.values()])

  return NextResponse.json({
    listings,
    total: listings.length,
    truncated: apiTotal > listings.length,
  })
}
