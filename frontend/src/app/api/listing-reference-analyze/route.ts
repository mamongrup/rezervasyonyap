import { requireAdminPermission } from '@/lib/api-require-admin'
import { lookup } from 'node:dns/promises'
import { isIP } from 'node:net'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
const MAX_BYTES = 2_000_000

function privateAddress(ip: string): boolean {
  return /^(127\.|10\.|0\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|::1$|fc|fd|fe80)/i.test(ip)
}

async function safeUrl(raw: string): Promise<URL> {
  const url = new URL(raw)
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw new Error('Geçersiz bağlantı')
  const host = url.hostname.replace(/^\[|\]$/g, '')
  const addresses = isIP(host) ? [{ address: host }] : await lookup(host, { all: true })
  if (!addresses.length || addresses.some(({ address }) => privateAddress(address))) throw new Error('Yerel veya özel ağ adreslerine erişilemez')
  return url
}

function decode(value: string): string {
  return value.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim()
}

function meta(html: string, key: string): string {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const patterns = [
    new RegExp(`<meta[^>]+(?:property|name)=["']${escaped}["'][^>]+content=["']([^"']+)["']`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${escaped}["']`, 'i'),
  ]
  for (const pattern of patterns) {
    const found = html.match(pattern)?.[1]
    if (found) return decode(found)
  }
  return ''
}

export async function POST(req: NextRequest) {
  const authError = await requireAdminPermission('admin.users.read')
  if (authError) return authError
  try {
    const body = (await req.json()) as { url?: string }
    let current = await safeUrl(String(body.url ?? '').trim())
    let response: Response | null = null
    for (let redirect = 0; redirect < 4; redirect += 1) {
      response = await fetch(current, { redirect: 'manual', signal: AbortSignal.timeout(12_000), headers: { 'User-Agent': 'RezervasyonYap-ListingImporter/1.0' } })
      if (![301, 302, 303, 307, 308].includes(response.status)) break
      const location = response.headers.get('location')
      if (!location) throw new Error('Geçersiz yönlendirme')
      current = await safeUrl(new URL(location, current).toString())
    }
    if (!response?.ok) throw new Error(`Kaynak ${response?.status ?? 502} yanıtı verdi`)
    const type = response.headers.get('content-type') ?? ''
    if (!type.includes('text/html') && !type.includes('application/xhtml')) throw new Error('Kaynak bir web sayfası değil')
    const declared = Number(response.headers.get('content-length') || 0)
    if (declared > MAX_BYTES) throw new Error('Kaynak sayfa çok büyük')
    const html = (await response.text()).slice(0, MAX_BYTES)
    const jsonLd = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)]
      .map((m) => { try { return JSON.parse(m[1]) as Record<string, unknown> } catch { return null } })
      .find(Boolean)
    const offers = jsonLd && typeof jsonLd.offers === 'object' ? jsonLd.offers as Record<string, unknown> : null
    const titleTag = decode(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? '')
    const driveIds = current.hostname === 'drive.google.com'
      ? [...new Set([...html.matchAll(/(?:\/file\/d\/|\\x2Ffile\\x2Fd\\x2F)([a-zA-Z0-9_-]{20,})/g)].map((match) => match[1]))]
      : []
    return NextResponse.json({
      title: String(jsonLd?.name ?? meta(html, 'og:title') ?? titleTag).slice(0, 240),
      description: String(jsonLd?.description ?? meta(html, 'og:description') ?? meta(html, 'description')).slice(0, 10_000),
      image: String(jsonLd?.image ?? meta(html, 'og:image')).slice(0, 2_000),
      images: driveIds.slice(0, 100).map((id) => `https://drive.google.com/uc?export=download&id=${id}`),
      price: String(offers?.price ?? meta(html, 'product:price:amount')).replace(/[^0-9.,]/g, '').slice(0, 30),
      sourceUrl: current.toString(),
    })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Bağlantı okunamadı' }, { status: 400 })
  }
}
