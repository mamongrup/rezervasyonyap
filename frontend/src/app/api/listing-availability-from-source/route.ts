/**
 * Referans site HTML → AI (Gemini havuzu) → dolu tarih aralıkları.
 * Yalnızca kapalı gün yazar (müsait gün açmaz). dry_run varsayılan true.
 */
import { requireAdminPermission } from '@/lib/api-require-admin'
import { apiOriginForFetch } from '@/lib/api-origin'
import { buildBlockedRangeCalendarDays } from '@/lib/blocked-range-calendar'
import {
  createAiJob,
  getAiJob,
  getListingAvailabilityCalendar,
  getListingMeta,
  putListingAvailabilityCalendar,
  runAiJob,
} from '@/lib/travel-api'
import { lookup } from 'node:dns/promises'
import { isIP } from 'node:net'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

const MAX_BYTES = 2_000_000
const EXCERPT_MAX = 70_000
const MIN_CONFIDENCE = 0.45

function privateAddress(ip: string): boolean {
  return /^(127\.|10\.|0\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|::1$|fc|fd|fe80)/i.test(ip)
}

async function safeUrl(raw: string): Promise<URL> {
  const url = new URL(raw)
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
    throw new Error('Geçersiz bağlantı')
  }
  const host = url.hostname.replace(/^\[|\]$/g, '')
  const addresses = isIP(host) ? [{ address: host }] : await lookup(host, { all: true })
  if (!addresses.length || addresses.some(({ address }) => privateAddress(address))) {
    throw new Error('Yerel veya özel ağ adreslerine erişilemez')
  }
  return url
}

function looksLikeIcs(url: string, contentType: string): boolean {
  const u = url.toLowerCase()
  const ct = contentType.toLowerCase()
  return (
    u.includes('.ics') ||
    u.includes('calendar.ics') ||
    u.includes('ical') && u.endsWith('.ics') ||
    ct.includes('text/calendar') ||
    ct.includes('application/ics')
  )
}

function buildExcerpt(html: string): string {
  const scripts = [...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/gi)]
    .map((m) => m[1] || '')
    .filter((s) =>
      /availab|booked|calendar|disabledDates|blocked|occupied|dolu|kapal|reservation|priceCalendar/i.test(
        s,
      ),
    )
    .join('\n')
    .slice(0, 40_000)

  const stripped = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  const combined = [scripts && `SCRIPT_DATA:\n${scripts}`, `PAGE_TEXT:\n${stripped}`]
    .filter(Boolean)
    .join('\n\n')
  return combined.slice(0, EXCERPT_MAX)
}

function ymd(d: Date): string {
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function parseYmd(s: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || '').trim())
  if (!m) return null
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])))
  return Number.isNaN(d.getTime()) ? null : d
}

function expandRange(from: string, to: string, windowFrom: string, windowTo: string): string[] {
  const start = parseYmd(from)
  const end = parseYmd(to || from)
  const w0 = parseYmd(windowFrom)
  const w1 = parseYmd(windowTo)
  if (!start || !end || !w0 || !w1) return []
  const a = start.getTime() <= end.getTime() ? start : end
  const b = start.getTime() <= end.getTime() ? end : start
  const out: string[] = []
  for (let t = a.getTime(); t <= b.getTime(); t += 86_400_000) {
    if (t < w0.getTime() || t > w1.getTime()) continue
    out.push(ymd(new Date(t)))
    if (out.length > 400) break
  }
  return out
}

function stripAiJson(raw: string): string {
  let s = raw.trim()
  if (s.startsWith('```')) {
    s = s.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '')
  }
  const i = s.indexOf('{')
  const j = s.lastIndexOf('}')
  if (i >= 0 && j > i) s = s.slice(i, j + 1)
  return s.trim()
}

type BlockedRange = {
  from: string
  to: string
  kind?: string
  confidence?: number
  evidence?: string
}

async function fetchHtml(rawUrl: string): Promise<{ finalUrl: string; html: string; contentType: string }> {
  let current = await safeUrl(rawUrl)
  let response: Response | null = null
  for (let redirect = 0; redirect < 4; redirect += 1) {
    response = await fetch(current, {
      redirect: 'manual',
      signal: AbortSignal.timeout(15_000),
      headers: { 'User-Agent': 'RezervasyonYap-AvailabilityAI/1.0' },
    })
    if (![301, 302, 303, 307, 308].includes(response.status)) break
    const location = response.headers.get('location')
    if (!location) throw new Error('Geçersiz yönlendirme')
    current = await safeUrl(new URL(location, current).toString())
  }
  if (!response?.ok) throw new Error(`Kaynak ${response?.status ?? 502} yanıtı verdi`)
  const contentType = response.headers.get('content-type') ?? ''
  if (looksLikeIcs(current.toString(), contentType)) {
    throw new Error('ics_use_ical_tab')
  }
  if (!contentType.includes('text/html') && !contentType.includes('application/xhtml') && !contentType.includes('application/json')) {
    throw new Error('Kaynak bir web sayfası değil')
  }
  const declared = Number(response.headers.get('content-length') || 0)
  if (declared > MAX_BYTES) throw new Error('Kaynak sayfa çok büyük')
  const html = (await response.text()).slice(0, MAX_BYTES)
  return { finalUrl: current.toString(), html, contentType }
}

export async function POST(req: NextRequest) {
  const authError = await requireAdminPermission('admin.users.read')
  if (authError) return authError

  const cookieStore = await cookies()
  const token = cookieStore.get('travel_auth_token')?.value
  if (!token) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  if (!apiOriginForFetch()) {
    return NextResponse.json({ error: 'NEXT_PUBLIC_API_URL_missing' }, { status: 500 })
  }

  try {
    const body = (await req.json()) as {
      listingId?: string
      url?: string
      apply?: boolean
      /** Kaynakta artık dolu görünmeyen, bizde kapalı günleri aç (varsayılan true) */
      reopen?: boolean
      from?: string
      to?: string
      organizationId?: string
    }
    const listingId = String(body.listingId ?? '').trim()
    if (!listingId) return NextResponse.json({ error: 'listing_id_required' }, { status: 400 })

    const apply = body.apply === true
    const reopen = body.reopen !== false
    const today = new Date()
    const defaultFrom = ymd(today)
    const defaultTo = ymd(new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 6, today.getUTCDate())))
    const windowFrom = String(body.from ?? defaultFrom).trim() || defaultFrom
    const windowTo = String(body.to ?? defaultTo).trim() || defaultTo

    const orgQ = body.organizationId?.trim()
      ? { organizationId: body.organizationId.trim() }
      : undefined

    let sourceUrl = String(body.url ?? '').trim()
    if (!sourceUrl) {
      const meta = (await getListingMeta(token, listingId, orgQ)) as Record<string, unknown>
      sourceUrl =
        String(meta.source_availability_url ?? '').trim() ||
        String(meta.source_reference_url ?? '').trim() ||
        String(meta.source_price_url ?? '').trim()
    }
    if (!sourceUrl) {
      return NextResponse.json(
        { error: 'source_url_missing', message: 'Önce ilan referans veya müsaitlik bağlantısını kaydedin.' },
        { status: 400 },
      )
    }
    if (looksLikeIcs(sourceUrl, '')) {
      return NextResponse.json(
        {
          error: 'ics_use_ical_tab',
          message: 'Bu bağlantı iCal/ICS. Takvim & Sezon → iCal Senkronizasyon sekmesini kullanın.',
        },
        { status: 400 },
      )
    }

    const { finalUrl, html } = await fetchHtml(sourceUrl)
    const excerpt = buildExcerpt(html)
    if (excerpt.length < 80) {
      return NextResponse.json({
        ok: true,
        applied: false,
        insufficient_data: true,
        source_url: finalUrl,
        blocked_ranges: [],
        blocked_days: [],
        notes: 'Sayfada kullanılabilir takvim metni bulunamadı (çoğu JS takvim SSR’da boş gelir).',
      })
    }

    const input = {
      listing_id: listingId,
      source_url: finalUrl,
      window_from: windowFrom,
      window_to: windowTo,
      locale: 'tr',
      html_excerpt: excerpt,
      instruction:
        'Extract blocked/unavailable stay nights from html_excerpt. Return only the JSON schema from the system prompt.',
    }

    const { id: jobId } = await createAiJob(token, {
      profile_code: 'listing_availability_scrape',
      input_json: JSON.stringify(input),
      run: true,
    })
    let job = await getAiJob(token, jobId)
    if (job.status === 'queued') {
      await runAiJob(token, jobId)
      job = await getAiJob(token, jobId)
    }
    if (job.status !== 'succeeded') {
      return NextResponse.json(
        {
          error: job.error || 'listing_availability_ai_failed',
          job_id: jobId,
          status: job.status,
        },
        { status: 502 },
      )
    }

    let text = ''
    try {
      const out = JSON.parse(job.output_json || '{}') as { text?: string }
      text = String(out.text ?? job.output_json ?? '')
    } catch {
      text = String(job.output_json ?? '')
    }

    let parsed: {
      blocked_ranges?: BlockedRange[]
      notes?: string
      insufficient_data?: boolean
    } = {}
    try {
      parsed = JSON.parse(stripAiJson(text)) as typeof parsed
    } catch {
      return NextResponse.json(
        { error: 'ai_json_parse_failed', job_id: jobId, raw: text.slice(0, 400) },
        { status: 502 },
      )
    }

    const ranges = Array.isArray(parsed.blocked_ranges) ? parsed.blocked_ranges : []
    const daySet = new Set<string>()
    const acceptedRanges: BlockedRange[] = []
    const expandedRanges: Parameters<typeof buildBlockedRangeCalendarDays>[0] = []
    for (const r of ranges) {
      const conf = typeof r.confidence === 'number' ? r.confidence : 0.5
      if (conf < MIN_CONFIDENCE) continue
      const days = expandRange(String(r.from || ''), String(r.to || r.from || ''), windowFrom, windowTo)
      if (!days.length) continue
      acceptedRanges.push({
        from: String(r.from),
        to: String(r.to || r.from),
        kind: r.kind || 'full',
        confidence: conf,
        evidence: String(r.evidence || '').slice(0, 200),
      })
      const orderedBounds = [String(r.from).trim(), String(r.to || r.from).trim()].sort()
      expandedRanges.push({
        days,
        includesStartBoundary: days[0] === orderedBounds[0],
        includesEndBoundary: days.at(-1) === orderedBounds[1],
        singleDayClosure: orderedBounds[0] === orderedBounds[1],
      })
      for (const d of days) daySet.add(d)
    }
    const blockedDays = [...daySet].sort()
    const aiInsufficient = Boolean(parsed.insufficient_data)

    // Bizde kapalı ama kaynakta dolu listesinde olmayan günler → açılabilir adaylar
    let reopenDays: string[] = []
    let currentDays: Awaited<ReturnType<typeof getListingAvailabilityCalendar>>['days'] = []
    if (!aiInsufficient && (reopen || expandedRanges.length > 0)) {
      try {
        const current = await getListingAvailabilityCalendar(
          token,
          listingId,
          { from: windowFrom, to: windowTo },
          orgQ,
        )
        currentDays = current.days || []
        if (reopen) {
          reopenDays = currentDays
            .filter((d) => {
              const closed = !(d.am_available ?? d.is_available) && !(d.pm_available ?? d.is_available)
              return closed && !daySet.has(d.day)
            })
            .map((d) => d.day)
            .sort()
        }
      } catch {
        reopenDays = []
      }
    }

    let applied = false
    if (apply && !aiInsufficient && (blockedDays.length > 0 || reopenDays.length > 0)) {
      const patch = [
        ...buildBlockedRangeCalendarDays(expandedRanges, currentDays),
        ...reopenDays.map((day) => ({
          day,
          is_available: true,
          am_available: true,
          pm_available: true,
          price_override: '',
          day_status: null,
        })),
      ]
      await putListingAvailabilityCalendar(token, listingId, { days: patch }, orgQ)
      applied = true
    }

    return NextResponse.json({
      ok: true,
      job_id: jobId,
      source_url: finalUrl,
      applied,
      dry_run: !apply,
      reopen,
      insufficient_data: aiInsufficient,
      notes: String(parsed.notes || '').slice(0, 500),
      blocked_ranges: acceptedRanges,
      blocked_days: blockedDays,
      blocked_day_count: blockedDays.length,
      reopen_days: reopenDays,
      reopen_day_count: reopenDays.length,
      window_from: windowFrom,
      window_to: windowTo,
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'availability_scrape_failed'
    if (msg === 'ics_use_ical_tab') {
      return NextResponse.json(
        {
          error: 'ics_use_ical_tab',
          message: 'Bu bağlantı iCal/ICS. Takvim & Sezon → iCal Senkronizasyon sekmesini kullanın.',
        },
        { status: 400 },
      )
    }
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
