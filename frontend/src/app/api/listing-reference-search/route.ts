import { requireAdminPermission } from '@/lib/api-require-admin'
import { lookup } from 'node:dns/promises'
import { isIP } from 'node:net'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
type Candidate = { url: string; title: string; snippet: string; score?: number; reason?: string }
const privateIp = (ip: string) => /^(127\.|10\.|0\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|::1$|fc|fd|fe80)/i.test(ip)
const clean = (s: string) => s.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/\s+/g, ' ').trim()
const words = (s: string) => new Set(s.toLocaleLowerCase('tr-TR').replace(/[^\p{L}\p{N}]+/gu, ' ').split(/\s+/).filter((x) => x.length > 2))

async function assertPublic(raw: string) {
  const url = new URL(raw)
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw new Error('unsafe_url')
  const host = url.hostname.replace(/^\[|\]$/g, '')
  const addresses = isIP(host) ? [{ address: host }] : await lookup(host, { all: true })
  if (!addresses.length || addresses.some(({ address }) => privateIp(address))) throw new Error('private_address')
  return url
}

async function pageText(raw: string) {
  let url = await assertPublic(raw)
  for (let i = 0; i < 4; i += 1) {
    const res = await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(10_000), headers: { 'user-agent': 'Mozilla/5.0 RezervasyonYapReference/1.0' } })
    if ([301, 302, 303, 307, 308].includes(res.status)) {
      const next = res.headers.get('location'); if (!next) throw new Error('bad_redirect')
      url = await assertPublic(new URL(next, url).toString()); continue
    }
    if (!res.ok || !(res.headers.get('content-type') || '').includes('text/html')) throw new Error(`http_${res.status}`)
    return clean((await res.text()).slice(0, 1_500_000)).slice(0, 30_000)
  }
  throw new Error('redirect_limit')
}

async function search(query: string): Promise<Candidate[]> {
  const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`
  const html = await fetch(url, { signal: AbortSignal.timeout(12_000), headers: { 'user-agent': 'Mozilla/5.0' } }).then((r) => r.text())
  const results: Candidate[] = []
  const re = /<a[^>]+class="result__a"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<a[^>]+class="result__snippet"[^>]*>([\s\S]*?)<\/a>/gi
  for (const m of html.matchAll(re)) {
    const wrapped = new URL(m[1], 'https://duckduckgo.com')
    const target = wrapped.searchParams.get('uddg') || m[1]
    try {
      const parsed = new URL(target)
      if (!['http:', 'https:'].includes(parsed.protocol) || results.some((x) => new URL(x.url).hostname === parsed.hostname)) continue
      results.push({ url: parsed.toString(), title: clean(m[2]), snippet: clean(m[3]) })
      if (results.length === 5) break
    } catch { /* bozuk sonuç atlanır */ }
  }
  return results
}

export async function POST(req: NextRequest) {
  const auth = await requireAdminPermission('admin.users.read'); if (auth) return auth
  try {
    const body = await req.json() as { action?: string; query?: string; candidates?: Candidate[] }
    const query = String(body.query || '').trim().slice(0, 400)
    if (!query) return NextResponse.json({ error: 'Arama bilgisi eksik.' }, { status: 400 })
    if (body.action !== 'evaluate') return NextResponse.json({ candidates: await search(query) })
    const candidates = (body.candidates || []).slice(0, 3)
    if (candidates.length !== 3) return NextResponse.json({ error: 'Değerlendirme için tam 3 site seçin.' }, { status: 400 })
    const expected = words(query)
    const scored = await Promise.all(candidates.map(async (candidate) => {
      try {
        const text = await pageText(candidate.url); const actual = words(text)
        const hits = [...expected].filter((word) => actual.has(word))
        const score = expected.size ? Math.round((hits.length / expected.size) * 100) : 0
        return { ...candidate, score, reason: `${hits.length}/${expected.size} ayırt edici bilgi eşleşti: ${hits.slice(0, 8).join(', ') || 'eşleşme yok'}` }
      } catch { return { ...candidate, score: 0, reason: 'Sayfa güvenli biçimde okunamadı.' } }
    }))
    scored.sort((a, b) => (b.score || 0) - (a.score || 0))
    return NextResponse.json({ decision: scored[0], evaluated: scored, confident: (scored[0]?.score || 0) >= 45 })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Arama yapılamadı.' }, { status: 400 })
  }
}
