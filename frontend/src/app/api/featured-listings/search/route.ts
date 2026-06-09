import { NextRequest, NextResponse } from 'next/server'
import { requireAdminCookie } from '@/lib/api-require-admin'
import { safeCategorySlug } from '@/lib/featured-listings-utils'
import { fetchCategoryListings } from '@/lib/listings-fetcher'

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

  const result = await fetchCategoryListings(
    categorySlug,
    { q: q || undefined },
    { perPage: 100 },
    locale,
  )

  return NextResponse.json({
    listings: result.listings,
    total: result.total,
    truncated: result.total > result.listings.length,
  })
}
