/**
 * POST /api/social/facebook-post
 *
 * Facebook Page'e ilan paylaşır.
 * Sunucu tarafında çalışır — page_access_token client'a açılmaz.
 *
 * Body: { listing_id: string, caption?: string }
 * Returns: { ok, post_id, post_url, job_id }
 */

import { NextRequest, NextResponse } from 'next/server'
import { getPublicSiteUrl } from '@/lib/site-branding-seo'

const INTERNAL = process.env.INTERNAL_API_ORIGIN ?? process.env.NEXT_PUBLIC_API_URL ?? ''
const FB_GRAPH = 'https://graph.facebook.com/v18.0'

// ─── Yardımcı: Backend'den JSON al ───────────────────────────────────────────

async function backendGet<T>(path: string, token: string): Promise<T> {
  const res = await fetch(`${INTERNAL}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  })
  if (!res.ok) {
    const e = await res.json().catch(() => ({})) as { error?: string }
    throw new Error(e.error ?? `backend_${res.status}: ${path}`)
  }
  return res.json() as Promise<T>
}

// ─── Yardımcı: Backend'e POST gönder ─────────────────────────────────────────

async function backendPost<T>(path: string, token: string, body: unknown): Promise<T> {
  const res = await fetch(`${INTERNAL}${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    cache: 'no-store',
  })
  if (!res.ok) {
    const e = await res.json().catch(() => ({})) as { error?: string }
    throw new Error(e.error ?? `backend_${res.status}: ${path}`)
  }
  return res.json() as Promise<T>
}

// ─── İlan detay URL'si ────────────────────────────────────────────────────────

const SEGMENT: Record<string, string> = {
  hotel: 'otel',
  holiday_home: 'tatil-evi',
  yacht_charter: 'yat',
  tour: 'tur',
  activity: 'aktivite',
  cruise: 'gemi-turu',
  transfer: 'tasima',
  car_rental: 'arac',
  ferry: 'feribot-rezervasyon',
}

function listingUrl(categoryCode: string, handle: string): string {
  const siteUrl = getPublicSiteUrl()
  const seg = SEGMENT[categoryCode] ?? categoryCode
  return `${siteUrl}/${seg}/${handle}`
}

// ─── Ana handler ──────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // 1. Auth
  const authHeader = req.headers.get('authorization') ?? ''
  const token = authHeader.replace(/^Bearer\s+/i, '').trim()
  if (!token) return NextResponse.json({ error: 'auth_required' }, { status: 401 })

  // 2. Body parse
  let body: {
    listing_id?: string
    caption?: string
    /** Önceden bilinen ilan alanları — geçilirse backend'e tekrar istek atılmaz */
    listing_title?: string
    listing_handle?: string
    listing_category_code?: string
  }
  try {
    body = await req.json() as typeof body
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }
  const { listing_id, caption } = body
  if (!listing_id) return NextResponse.json({ error: 'listing_id_required' }, { status: 400 })

  // 3. Kullanıcı doğrula
  try {
    await backendGet('/api/v1/auth/me', token)
  } catch {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  // 4. İlan bilgilerini belirle
  // Frontend zaten başlık/slug/kategori biliyor; bunları geçerse backend çağrısı gerekmez.
  let basics: { title: string; handle: string; category_code: string }

  if (body.listing_title && body.listing_handle && body.listing_category_code) {
    basics = {
      title: body.listing_title,
      handle: body.listing_handle,
      category_code: body.listing_category_code,
    }
  } else {
    // Fallback: manage-listings listesinden çek (org_id gerektirmez, admin görür)
    try {
      const listRes = await backendGet<{ listings: { id: string; title: string; slug: string; category_code: string }[] }>(
        `/api/v1/catalog/manage-listings?search=${encodeURIComponent(listing_id)}`,
        token,
      )
      const match = listRes.listings.find((l) => l.id === listing_id)
      if (!match) throw new Error('not_found')
      basics = { title: match.title, handle: match.slug, category_code: match.category_code }
    } catch (e) {
      return NextResponse.json({ error: `listing_not_found: ${String(e)}` }, { status: 404 })
    }
  }

  // 5. social_api ayarlarını al
  interface SocialApi {
    meta?: {
      page_id?: string
      page_access_token?: string
      auto_post?: boolean
    }
  }
  let socialApi: SocialApi = {}
  try {
    const sRes = await backendGet<{ settings: { key: string; value_json: string }[] }>(
      '/api/v1/site-settings?key=social_api',
      token,
    )
    const row = sRes.settings.find((s) => s.key === 'social_api')
    if (row) socialApi = JSON.parse(row.value_json) as SocialApi
  } catch {
    // Ayar yoksa devam et — aşağıda kontrol
  }

  const meta = socialApi.meta ?? {}
  if (!meta.page_id || !meta.page_access_token) {
    return NextResponse.json(
      { error: 'facebook_not_configured', hint: 'Admin → Sosyal Medya → API Ayarları → Meta bölümüne Page ID ve Page Access Token girin.' },
      { status: 422 },
    )
  }

  // 6. Paylaşım metnini hazırla
  const pageUrl = listingUrl(basics.category_code, basics.handle)
  const message = caption?.trim()
    || `${basics.title}\n\n${basics.description ? String(basics.description).slice(0, 200).trim() + '…' : ''}\n\n🔗 ${pageUrl}`

  // 7. Facebook Graph API — /feed endpoint
  const fbRes = await fetch(`${FB_GRAPH}/${encodeURIComponent(meta.page_id)}/feed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message,
      link: pageUrl,
      access_token: meta.page_access_token,
    }),
  })

  const fbData = await fbRes.json() as { id?: string; error?: { message: string; type: string; code: number } }

  if (!fbRes.ok || fbData.error) {
    const errMsg = fbData.error?.message ?? `fb_${fbRes.status}`

    // Kuyruğa başarısız kayıt
    try {
      await backendPost('/api/v1/social/jobs', token, {
        entity_type: 'listing',
        entity_id: listing_id,
        image_keys: [],
        caption_ai_generated: message,
        status: 'failed',
      })
    } catch { /* log hatası önemsiz */ }

    return NextResponse.json({ ok: false, error: errMsg }, { status: 502 })
  }

  // 8. Kuyruk kaydı oluştur (posted)
  let jobId: string | undefined
  try {
    const job = await backendPost<{ id: string }>('/api/v1/social/jobs', token, {
      entity_type: 'listing',
      entity_id: listing_id,
      image_keys: [],
      caption_ai_generated: message,
    })
    jobId = job.id
  } catch { /* log hatası önemsiz */ }

  const postId = fbData.id ?? ''
  const postUrl = postId ? `https://www.facebook.com/${postId.replace('_', '/posts/')}` : undefined

  return NextResponse.json({
    ok: true,
    post_id: postId,
    post_url: postUrl,
    listing_url: pageUrl,
    job_id: jobId,
    message_preview: message.slice(0, 80),
  })
}
