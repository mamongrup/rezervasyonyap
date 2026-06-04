import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyAdminToken } from '@/lib/security'
import { apiOriginForFetch } from '@/lib/api-origin'

/** Server-side Pexels proxy — API anahtarı URL'de değil sunucuda yüklenir.
 *  GET /api/pexels-search?q=Nemrut+Dağı&per_page=1
 *  Döner: { photos: [{ src: { large: string, medium: string }, photographer: string }] }
 */

async function loadPexelsApiKey(token: string): Promise<string | null> {
  const apiBase = apiOriginForFetch()
  if (!apiBase) return null
  try {
    const r = await fetch(`${apiBase}/api/v1/site/settings?key=pexels`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    })
    if (!r.ok) return null
    const data = (await r.json()) as { settings?: Array<{ key: string; value_json: unknown }> }
    const row = Array.isArray(data.settings) ? data.settings.find((s) => s.key === 'pexels') : null
    if (!row?.value_json) return null
    const v = typeof row.value_json === 'string' ? JSON.parse(row.value_json) : row.value_json
    const keys: string[] = Array.isArray(v?.api_keys) ? (v.api_keys as string[]).filter(Boolean) : []
    return keys[0] ?? null
  } catch {
    return null
  }
}

export async function GET(req: NextRequest) {
  // Admin kimlik doğrulama
  const cookieStore = await cookies()
  const token = cookieStore.get('travel_auth_token')?.value
  const auth = await verifyAdminToken(token, 'admin.users.read')
  if (!auth.ok) {
    return NextResponse.json({ error: 'unauthorized' }, { status: auth.status })
  }

  const { searchParams } = req.nextUrl
  const q = searchParams.get('q')?.trim()
  const perPage = Math.min(parseInt(searchParams.get('per_page') ?? '1', 10), 15)

  if (!q) return NextResponse.json({ error: 'q required' }, { status: 400 })

  // Önce env fallback, sonra DB
  const apiKey = process.env.PEXELS_API_KEY?.trim() || (await loadPexelsApiKey(token!)) || ''
  if (!apiKey) return NextResponse.json({ error: 'pexels_api_key_not_configured' }, { status: 503 })

  try {
    const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(q)}&per_page=${perPage}&locale=tr-TR`
    const res = await fetch(url, {
      headers: { Authorization: apiKey },
      next: { revalidate: 3600 },
    })
    if (!res.ok) {
      return NextResponse.json({ error: 'pexels_error', status: res.status }, { status: res.status })
    }
    const data = await res.json() as {
      photos: Array<{
        id: number
        photographer: string
        src: { original: string; large2x: string; large: string; medium: string; small: string }
        alt: string
      }>
      total_results: number
    }
    return NextResponse.json({
      total: data.total_results,
      photos: data.photos.map((p) => ({
        id: p.id,
        alt: p.alt,
        photographer: p.photographer,
        src: {
          large: p.src.large,
          medium: p.src.medium,
          small: p.src.small,
        },
      })),
    })
  } catch {
    return NextResponse.json({ error: 'fetch_failed' }, { status: 500 })
  }
}
