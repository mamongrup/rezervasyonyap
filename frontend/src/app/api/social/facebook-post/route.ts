/**
 * POST /api/social/facebook-post
 *
 * Facebook Page'e ilan paylaşır.
 * Sunucu tarafında çalışır — page_access_token client'a açılmaz.
 *
 * Body: { listing_id: string, caption?: string }
 * Returns: { ok, post_id, job_id, results }
 */

import { NextRequest, NextResponse } from 'next/server'
import { getPublicSiteUrl } from '@/lib/site-branding-seo'
import { verifyAdminToken } from '@/lib/security'
import { processOneSocialJob, type PendingSocialJob, type SocialApiSettings } from '@/lib/social-auto-post'

const INTERNAL = process.env.INTERNAL_API_ORIGIN ?? process.env.NEXT_PUBLIC_API_URL ?? ''

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

async function backendPublicGet<T>(path: string): Promise<T> {
  const res = await fetch(`${INTERNAL}${path}`, {
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
  const workerSecret = process.env.TRAVEL_SOCIAL_WORKER_SECRET ?? ''
  if (!INTERNAL.trim()) {
    return NextResponse.json({ error: 'api_origin_missing' }, { status: 503 })
  }
  if (!workerSecret.trim()) {
    return NextResponse.json({ error: 'worker_secret_not_configured' }, { status: 503 })
  }
  const siteUrl = getPublicSiteUrl()
  if (!siteUrl.trim()) {
    return NextResponse.json({ error: 'site_url_missing' }, { status: 503 })
  }

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

  // 3. Admin sosyal paylaşım yetkisi (backend social/jobs ile uyumlu)
  const auth = await verifyAdminToken(token, 'admin.social.write')
  if (!auth.ok) {
    return NextResponse.json(
      { error: auth.status === 403 ? 'forbidden' : 'unauthorized' },
      { status: auth.status },
    )
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
  let socialApi: SocialApiSettings = {}
  try {
    const sRes = await backendGet<{ settings: { key: string; value_json: string }[] }>(
      '/api/v1/site/settings?scope=platform&key=social_api',
      token,
    )
    const row = sRes.settings.find((s) => s.key === 'social_api')
    if (row) socialApi = JSON.parse(row.value_json) as SocialApiSettings
  } catch {
    // Ayar yoksa devam et — aşağıda kontrol
  }

  const meta = socialApi.meta ?? {}
  if (!meta.page_id || !meta.page_access_token || !meta.instagram_account_id) {
    return NextResponse.json(
      { error: 'meta_not_configured', hint: 'Admin → Sosyal Medya → API Ayarları → Meta bölümüne Page ID, Instagram Account ID ve Page Access Token girin.' },
      { status: 422 },
    )
  }

  // 6. Galeri görsellerini ve paylaşım metnini hazırla
  let imageKeys: string[] = []
  try {
    const imgs = await backendPublicGet<{ images: Array<{ storage_key?: string }> }>(
      `/api/v1/catalog/public/listings/${encodeURIComponent(listing_id)}/images`,
    )
    imageKeys = (imgs.images ?? [])
      .map((img) => img.storage_key?.trim() ?? '')
      .filter(Boolean)
      .slice(0, 10)
  } catch {
    imageKeys = []
  }

  if (imageKeys.length === 0) {
    return NextResponse.json(
      { error: 'image_keys_required', hint: 'Bu ilanın yayınlanmış galeri görseli bulunamadı. Önce ilana en az 1 görsel ekleyin.' },
      { status: 422 },
    )
  }

  const pageUrl = listingUrl(basics.category_code, basics.handle)
  const customCaption = caption?.trim() ?? ''
  const message = customCaption
    || `${basics.title}\n\n🔗 ${pageUrl}`

  // 7. Aynı worker hattıyla Facebook + Instagram paylaş.
  const networks = ['facebook', 'instagram'] as const
  const results = []
  for (const network of networks) {
    const created = await backendPost<{ id: string }>('/api/v1/social/jobs', token, {
      entity_type: 'listing',
      entity_id: listing_id,
      network,
      image_keys: imageKeys,
      caption_ai_generated: customCaption || undefined,
    })

    const job: PendingSocialJob = {
      id: created.id,
      network,
      entity_id: listing_id,
      entity_type: 'listing',
      image_keys: imageKeys,
      caption_ai_generated: customCaption || null,
      allow_ai_caption: !customCaption,
      listing_title: basics.title,
      listing_slug: basics.handle,
      category_code: basics.category_code,
      template_body: null,
    }
    results.push(await processOneSocialJob(INTERNAL, workerSecret, job, socialApi, siteUrl))
  }

  const failed = results.filter((r) => !r.ok)
  if (failed.length > 0) {
    return NextResponse.json(
      {
        ok: false,
        error: failed.map((r) => `${r.network}: ${r.error}`).join(' | '),
        results,
        hint: 'Meta token, Instagram Account ID veya görsel erişimi hatalı olabilir. Hata ağ bazında yukarıdadır.',
      },
      { status: 502 },
    )
  }

  return NextResponse.json({
    ok: true,
    post_id: results.map((r) => `${r.network}:${r.post_id ?? ''}`).join(', '),
    listing_url: pageUrl,
    job_id: results.map((r) => r.job_id).join(', '),
    results,
    message_preview: message.slice(0, 80),
  })
}
