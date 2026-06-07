/**
 * /api/location-search?q=antalya
 * /api/location-search?q=balkan&type=tour  → hub + destinasyon önerileri
 *
 * Backend API bağlıysa oradaki bölge/ilçe kayıtlarından arama yapar.
 * Bağlı değilse (NEXT_PUBLIC_API_URL tanımlı değil veya API yanıt vermiyorsa)
 * Türkiye'nin popüler şehirlerinden oluşan statik fallback döner.
 *
 * type=tour eklenince iki sonuç türü döner:
 *  - tour_hub : tur hub kategorisi eşleşmesi → hubPath ile direkt navigasyon
 *  - region / static : destinasyon araması → tarih + kişi ile arama
 */

import { apiOriginForFetch } from '@/lib/api-origin'
import { getTourHubCategories } from '@/data/tour-hub-categories'
import { NextRequest, NextResponse } from 'next/server'

export interface LocationSuggestion {
  id: string
  name: string
  type: 'region' | 'district' | 'static' | 'tour_hub'
  /** Yalnızca type=tour_hub: tıklanınca gidilecek hub path */
  hubPath?: string
}

// ─── Statik Türkiye fallback ─────────────────────────────────────────────────

const STATIC_LOCATIONS: { name: string; region?: string }[] = [
  { name: 'İstanbul' },
  { name: 'Antalya' },
  { name: 'İzmir' },
  { name: 'Ankara' },
  { name: 'Bodrum', region: 'Muğla' },
  { name: 'Fethiye', region: 'Muğla' },
  { name: 'Marmaris', region: 'Muğla' },
  { name: 'Kapadokya', region: 'Nevşehir' },
  { name: 'Alanya', region: 'Antalya' },
  { name: 'Kemer', region: 'Antalya' },
  { name: 'Side', region: 'Antalya' },
  { name: 'Belek', region: 'Antalya' },
  { name: 'Pamukkale', region: 'Denizli' },
  { name: 'Trabzon' },
  { name: 'Bursa' },
  { name: 'Konya' },
  { name: 'Gaziantep' },
  { name: 'Ölüdeniz', region: 'Muğla' },
  { name: 'Çeşme', region: 'İzmir' },
  { name: 'Göcek', region: 'Muğla' },
  { name: 'Kuşadası', region: 'Aydın' },
  { name: 'Çanakkale' },
  { name: 'Eskişehir' },
  { name: 'Rize' },
  { name: 'Amasra', region: 'Bartın' },
  { name: 'Sapanca', region: 'Sakarya' },
  { name: 'Abant', region: 'Bolu' },
]

function staticFallback(q: string): LocationSuggestion[] {
  const lower = q.toLowerCase()
  return STATIC_LOCATIONS.filter((l) =>
    l.name.toLowerCase().includes(lower) || (l.region?.toLowerCase().includes(lower) ?? false)
  )
    .slice(0, 8)
    .map((l) => ({
      id: `static-${l.name}`,
      name: l.region ? `${l.name}, ${l.region}` : l.name,
      type: 'static' as const,
    }))
}

function defaultSuggestions(): LocationSuggestion[] {
  return [
    { id: 'static-antalya',   name: 'Antalya',          type: 'static' },
    { id: 'static-istanbul',  name: 'İstanbul',          type: 'static' },
    { id: 'static-bodrum',    name: 'Bodrum, Muğla',     type: 'static' },
    { id: 'static-kappadokya',name: 'Kapadokya, Nevşehir', type: 'static' },
    { id: 'static-izmir',     name: 'İzmir',             type: 'static' },
    { id: 'static-fethiye',   name: 'Fethiye, Muğla',    type: 'static' },
  ]
}

// ─── GET ─────────────────────────────────────────────────────────────────────

/** Yolcu360 locations proxy — araç kiralama için teslim/iade noktaları */
async function yolcu360Suggestions(q: string, apiBase: string): Promise<LocationSuggestion[]> {
  try {
    const res = await fetch(
      `${apiBase}/api/v1/public/yolcu360/locations?query=${encodeURIComponent(q)}`,
      { cache: 'no-store' },
    )
    if (!res.ok) return []
    const raw = (await res.json()) as unknown
    const arr = Array.isArray(raw)
      ? raw
      : Array.isArray((raw as Record<string, unknown>)['data'])
        ? ((raw as Record<string, unknown>)['data'] as unknown[])
        : []
    return arr.slice(0, 8).flatMap((item) => {
      const r = item && typeof item === 'object' ? (item as Record<string, unknown>) : null
      if (!r) return []
      const placeId = String(r['placeId'] ?? r['id'] ?? '').trim()
      const name = String(
        r['mainText'] ?? r['name'] ?? r['description'] ?? placeId,
      ).trim()
      if (!placeId || !name) return []
      return [{ id: `yolcu360-${placeId}`, name, type: 'region' as const }]
    })
  } catch {
    return []
  }
}

// ─── Tur hub eşleşmesi ───────────────────────────────────────────────────────

/**
 * Hub kategorileri + alt link etiketlerini arar.
 * Hem kart başlığını hem de alt linklerin label'larını eşleştirir.
 */
function tourHubSuggestions(q: string): LocationSuggestion[] {
  const lower = q.toLowerCase().replace(/\s+/g, ' ').trim()
  if (!lower) return []

  const hubs = getTourHubCategories('tr')
  const results: LocationSuggestion[] = []

  for (const hub of hubs) {
    const titleMatch =
      hub.title.toLowerCase().includes(lower) ||
      hub.titleEn.toLowerCase().includes(lower)

    if (titleMatch) {
      results.push({
        id: `hub-${hub.id}`,
        name: hub.title,
        type: 'tour_hub',
        hubPath: hub.path,
      })
    }

    // Alt link etiketleri (Belgrad, Saraybosna vb.)
    for (const link of hub.links) {
      if (link.label.toLowerCase().includes(lower)) {
        results.push({
          id: `hub-link-${hub.id}-${link.label}`,
          name: `${link.label} — ${hub.title}`,
          type: 'tour_hub',
          hubPath: link.path,
        })
      }
    }
  }

  // Tekrarsız, max 4 hub
  const seen = new Set<string>()
  return results.filter((r) => {
    if (seen.has(r.id)) return false
    seen.add(r.id)
    return true
  }).slice(0, 4)
}

/** type=tour varsayılan önerileri — popüler hub kategorileri */
function tourDefaultSuggestions(): LocationSuggestion[] {
  const hubs = getTourHubCategories('tr')
  return hubs.slice(0, 6).map((hub) => ({
    id: `hub-${hub.id}`,
    name: hub.title,
    type: 'tour_hub' as const,
    hubPath: hub.path,
  }))
}

// ─── GET ─────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get('q') ?? '').trim()
  const type = (req.nextUrl.searchParams.get('type') ?? '').trim()
  const isCarSearch = type === 'car'
  const isTourSearch = type === 'tour'

  // Tur araması — varsayılan hub önerileri
  if (!q && isTourSearch) {
    return NextResponse.json({ suggestions: tourDefaultSuggestions() })
  }

  // Sorgu yoksa popüler şehirleri döndür
  if (!q) {
    return NextResponse.json({ suggestions: defaultSuggestions() })
  }

  const apiBase = apiOriginForFetch()

  // Araç kiralama için Yolcu360 konum önerileri
  if (isCarSearch) {
    if (!apiBase) return NextResponse.json({ suggestions: staticFallback(q) })
    const yolcuSuggestions = await yolcu360Suggestions(q, apiBase)
    if (yolcuSuggestions.length > 0) {
      return NextResponse.json({ suggestions: yolcuSuggestions })
    }
    return NextResponse.json({ suggestions: staticFallback(q) })
  }

  // Tur araması — hub eşleşmesi + destinasyon karışık
  if (isTourSearch) {
    const hubMatches = tourHubSuggestions(q)

    // Backend destinasyon araması
    let destinationResults: LocationSuggestion[] = []
    if (apiBase) {
      try {
        const url = `${apiBase}/api/v1/locations/regions?search=${encodeURIComponent(q)}&per_page=5`
        const res = await fetch(url, { next: { revalidate: 60 } })
        if (res.ok) {
          const data = (await res.json()) as {
            regions?: { id: string; name: string }[]
            data?: { id: string; name: string }[]
          }
          const regions = data.regions ?? data.data ?? []
          destinationResults = regions.map((r) => ({ id: r.id, name: r.name, type: 'region' as const }))
        }
      } catch { /* sessiz */ }
    }

    // Destinasyon bulunamazsa statik fallback
    if (destinationResults.length === 0) {
      destinationResults = staticFallback(q)
    }

    // Hub önce, max 4 hub + max 4 destinasyon
    const suggestions = [...hubMatches, ...destinationResults.slice(0, 4)]
    return NextResponse.json({ suggestions })
  }

  // Genel bölge araması
  if (!apiBase) {
    return NextResponse.json({ suggestions: staticFallback(q) })
  }

  try {
    const url = `${apiBase}/api/v1/locations/regions?search=${encodeURIComponent(q)}&per_page=8`
    const res = await fetch(url, { next: { revalidate: 60 } })

    if (!res.ok) throw new Error(`api_${res.status}`)

    const data = (await res.json()) as {
      regions?: { id: string; name: string; slug: string }[]
      data?: { id: string; name: string; slug: string }[]
    }

    const regions = data.regions ?? data.data ?? []

    if (regions.length === 0) {
      return NextResponse.json({ suggestions: staticFallback(q) })
    }

    const suggestions: LocationSuggestion[] = regions.map((r) => ({
      id: r.id,
      name: r.name,
      type: 'region',
    }))

    return NextResponse.json({ suggestions })
  } catch {
    return NextResponse.json({ suggestions: staticFallback(q) })
  }
}
