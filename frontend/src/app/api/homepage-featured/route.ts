import { loadFeaturedPlacesModuleData } from '@/components/page-builder/modules/FeaturedPlacesModule'
import { getCategoryBySlug } from '@/data/category-registry'
import { NextRequest, NextResponse } from 'next/server'

export const revalidate = 300

export async function GET(request: NextRequest) {
  const category = (request.nextUrl.searchParams.get('category') ?? '').trim()
  const locale = (request.nextUrl.searchParams.get('locale') ?? 'tr').trim().toLowerCase()

  if (!category || !getCategoryBySlug(category)) {
    return NextResponse.json({ error: 'invalid_category' }, { status: 400 })
  }

  try {
    const data = await loadFeaturedPlacesModuleData(category, locale)
    return NextResponse.json(
      { data },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=900',
        },
      },
    )
  } catch {
    return NextResponse.json({ error: 'homepage_featured_failed' }, { status: 502 })
  }
}
