/**
 * /api/listing-search?q=balayı+villa&locale=tr&limit=8
 *
 * İlan başlığına + koleksiyonlara göre autocomplete sonuçları döner.
 */
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

  if (q.length < 3) {
    return NextResponse.json({ suggestions: [] })
  }

  const apiBase = process.env.NEXT_PUBLIC_API_URL ?? process.env.API_URL ?? ''

  const suggestions: SearchSuggestion[] = []

  if (apiBase) {
    await Promise.allSettled([
      // İlan araması
      fetch(
        `${apiBase}/api/v1/catalog/public/listings?q=${encodeURIComponent(q)}&locale=${locale}&limit=${limit}`,
        { next: { revalidate: 30 } },
      )
        .then((r) => r.json())
        .then((data: { listings?: { id: string; slug: string; title: string; category_code: string; featured_image_url: string | null; location: string | null }[] }) => {
          for (const item of data.listings ?? []) {
            suggestions.push({
              type: 'listing',
              id: item.id,
              slug: item.slug,
              title: item.title,
              subtitle: item.location ?? item.category_code,
              image: item.featured_image_url ?? undefined,
              href: `/listing/${item.slug}`,
            })
          }
        })
        .catch(() => undefined),

      // Koleksiyon araması
      fetch(`${apiBase}/api/v1/collections`, { next: { revalidate: 60 } })
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

  return NextResponse.json({ suggestions: suggestions.slice(0, limit) })
}
