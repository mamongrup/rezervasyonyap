import { NextRequest, NextResponse } from 'next/server'
import { searchPublicListings, type PublicListingItem } from '@/lib/travel-api'
import { normalizeCatalogVertical } from '@/lib/catalog-listing-vertical'
import { stayDetailPathForVertical } from '@/lib/listing-detail-routes'

export const dynamic = 'force-dynamic'

interface ConciergeRequest {
  query: string
  locale?: string
}

interface ParsedQuery {
  location?: string
  vertical?: string
  amenities: string[]
  budgetMax?: number
  guestCount?: number
}

function parseNaturalLanguageQuery(q: string): ParsedQuery {
  const text = q.toLowerCase()
  const parsed: ParsedQuery = { amenities: [] }

  // Lokasyon tespiti
  const locations = [
    'fethiye', 'bodrum', 'antalya', 'kaş', 'kalkan', 'marmaris', 'alaçatı',
    'çeşme', 'kuşadası', 'didim', 'kemer', 'alanya', 'side', 'belek',
    'kapadokya', 'sapanca', 'abant', 'bolu', 'ayvalık', 'bozcaada',
    'istanbul', 'izmir', 'muğla', 'kırklareli', 'lüleburgaz', 'edirne'
  ]
  for (const loc of locations) {
    if (text.includes(loc)) {
      parsed.location = loc.charAt(0).toUpperCase() + loc.slice(1)
      break
    }
  }

  // Dikey / Kategori tespiti
  if (text.includes('villa') || text.includes('tatil evi') || text.includes('yazlık') || text.includes('bungalov')) {
    parsed.vertical = 'holiday_home'
  } else if (text.includes('yat') || text.includes('tekne') || text.includes('gulet') || text.includes('mavi tur')) {
    parsed.vertical = 'yacht_charter'
  } else if (text.includes('tur') || text.includes('gezi') || text.includes('safari')) {
    parsed.vertical = 'tour'
  } else if (text.includes('otel') || text.includes('hotel') || text.includes('pansiyon') || text.includes('resort')) {
    parsed.vertical = 'hotel'
  }

  // Olanaklar
  if (text.includes('havuz') || text.includes('korunaklı')) parsed.amenities.push('pool')
  if (text.includes('jakuzi')) parsed.amenities.push('jacuzzi')
  if (text.includes('kahvaltı')) parsed.amenities.push('breakfast')
  if (text.includes('deniz') || text.includes('plaj')) parsed.amenities.push('beach')
  if (text.includes('çocuk') || text.includes('aile')) parsed.amenities.push('family')

  return parsed
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as ConciergeRequest
    const query = body.query?.trim()
    const locale = body.locale || 'tr'

    if (!query) {
      return NextResponse.json({ error: 'query_required' }, { status: 400 })
    }

    const parsed = parseNaturalLanguageQuery(query)
    const searchCategory = parsed.vertical || 'hotel'

    // İlanları ara
    const searchRes = await searchPublicListings({
      q: parsed.location || query,
      categoryCode: searchCategory,
      locale,
      perPage: 12,
    })

    const listings = (searchRes?.listings || []).map((l) => ({
      id: l.id,
      title: l.title,
      slug: l.slug,
      category: l.category_code,
      location: l.location,
      price: l.price_from ? `${l.price_from} TL` : 'Fiyat sorunuz',
      image: l.thumbnail_url || l.featured_image_url || l.gallery_urls?.[0] || null,
      href: `${stayDetailPathForVertical(normalizeCatalogVertical(l.listing_vertical || l.category_code))}/${l.slug}`,
    }))

    // Yanıt metni oluştur
    let summary = 'Aramanıza en uygun tatil ve konaklama seçeneklerini listeledik:'
    if (parsed.location && parsed.vertical === 'holiday_home') {
      summary = `${parsed.location} bölgesinde aradığınız kriterlere uygun villaları seçtik:`
    } else if (parsed.location && parsed.vertical === 'hotel') {
      summary = `${parsed.location} bölgesindeki en popüler ve yüksek puanlı otel seçenekleri:`
    } else if (parsed.location) {
      summary = `${parsed.location} için en iyi tatil ve rezervasyon fırsatları:`
    }

    return NextResponse.json({
      summary,
      parsed,
      totalMatches: listings.length,
      recommendations: listings.slice(0, 6),
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'concierge_failed' },
      { status: 500 },
    )
  }
}
