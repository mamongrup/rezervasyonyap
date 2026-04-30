import { NextRequest, NextResponse } from 'next/server'

/** Server-side Pexels proxy — API anahtarını istemciye göstermeden arama yapar.
 *  GET /api/pexels-search?q=Nemrut+Dağı&per_page=1&apiKey=PEXELS_KEY
 *  Döner: { photos: [{ src: { large: string, medium: string }, photographer: string }] }
 */
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const q = searchParams.get('q')?.trim()
  const perPage = Math.min(parseInt(searchParams.get('per_page') ?? '1', 10), 15)
  const apiKey = searchParams.get('apiKey')?.trim()

  if (!q) return NextResponse.json({ error: 'q required' }, { status: 400 })
  if (!apiKey) return NextResponse.json({ error: 'apiKey required' }, { status: 400 })

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
