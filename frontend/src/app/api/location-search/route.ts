/**
 * /api/location-search?q=antalya
 *
 * Backend API bağlıysa oradaki bölge/ilçe kayıtlarından arama yapar.
 * Bağlı değilse (NEXT_PUBLIC_API_URL tanımlı değil veya API yanıt vermiyorsa)
 * Türkiye'nin popüler şehirlerinden oluşan statik fallback döner.
 */

import { apiOriginForFetch } from '@/lib/api-origin'
import { NextRequest, NextResponse } from 'next/server'

export interface LocationSuggestion {
  id: string
  name: string
  type: 'region' | 'district' | 'static'
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

export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get('q') ?? '').trim()

  // Sorgu yoksa popüler şehirleri döndür
  if (!q) {
    return NextResponse.json({ suggestions: defaultSuggestions() })
  }

  const apiBase = apiOriginForFetch()
  if (!apiBase) {
    // API URL tanımlı değil — statik fallback
    return NextResponse.json({ suggestions: staticFallback(q) })
  }

  try {
    // Backend'de arama: önce bölgelerde ara
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
    // API erişilemez — statik fallback
    return NextResponse.json({ suggestions: staticFallback(q) })
  }
}
