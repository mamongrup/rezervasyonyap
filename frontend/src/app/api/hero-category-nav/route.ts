/**
 * GET /api/hero-category-nav
 * Hero kategori çubuğu — ilanı olan kategoriler + gerçek görseller.
 */
import {
  getHeroCategoryNavItems,
  heroCategoryNavToActiveSlugs,
  heroCategoryNavToImageMap,
} from '@/lib/hero-category-nav'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const items = await getHeroCategoryNavItems()
    return NextResponse.json(
      {
        activeSlugs: heroCategoryNavToActiveSlugs(items),
        categoryImages: heroCategoryNavToImageMap(items),
        items,
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=600',
        },
      },
    )
  } catch {
    return NextResponse.json({ activeSlugs: [], categoryImages: {}, items: [] }, { status: 200 })
  }
}
