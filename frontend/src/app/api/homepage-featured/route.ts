import { loadFeaturedPlacesModuleData } from '@/components/page-builder/modules/FeaturedPlacesModule'
import { getCategoryBySlug } from '@/data/category-registry'
import { NextRequest, NextResponse } from 'next/server'

export const revalidate = 900

export async function GET(request: NextRequest) {
  const category = (request.nextUrl.searchParams.get('category') ?? '').trim()
  const locale = (request.nextUrl.searchParams.get('locale') ?? 'tr').trim().toLowerCase()
  const includeLastMinuteRaw = (request.nextUrl.searchParams.get('include_last_minute') ?? '1')
    .trim()
    .toLowerCase()
  const includeLastMinute = !(
    includeLastMinuteRaw === '0' ||
    includeLastMinuteRaw === 'false' ||
    includeLastMinuteRaw === 'no'
  )

  if (!category || !getCategoryBySlug(category)) {
    return NextResponse.json({ error: 'invalid_category' }, { status: 400 })
  }

  try {
    const data = await loadFeaturedPlacesModuleData(category, locale, { includeLastMinute })
    return NextResponse.json(
      { data },
      {
        headers: {
          // Önce önerilenler (lite) kısa TTL ile ayrı cache anahtarı; last_minute ayrı istek.
          'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=3600',
        },
      },
    )
  } catch {
    return NextResponse.json({ error: 'homepage_featured_failed' }, { status: 502 })
  }
}
