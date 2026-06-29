/**
 * POST /api/google/merchant/sync
 * Yayınlanmış ilanları toplu Google Merchant API'ye gönderir.
 * Body: { category_code?: string, limit?: number, page?: number }
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminToken } from '@/lib/security'
import { getPublicSiteUrl } from '@/lib/site-branding-seo'
import {
  pushListingToMerchant,
  type GoogleMerchantSiteSettings,
  merchantConfigStatus,
} from '@/lib/google-merchant-api'
import {
  enrichListingForMerchant,
  fetchPublishedListingsForMerchant,
  recordMerchantPush,
} from '@/lib/google-merchant-sync'

const INTERNAL = process.env.INTERNAL_API_ORIGIN ?? process.env.NEXT_PUBLIC_API_URL ?? ''

async function loadSiteSettings(token: string): Promise<GoogleMerchantSiteSettings> {
  const res = await fetch(`${INTERNAL}/api/v1/site/settings?scope=platform&key=google_merchant`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  })
  if (!res.ok) return {}
  const data = (await res.json()) as { settings: { key: string; value_json: string }[] }
  const row = data.settings.find((s) => s.key === 'google_merchant')
  if (!row?.value_json) return {}
  try {
    return JSON.parse(row.value_json) as GoogleMerchantSiteSettings
  } catch {
    return {}
  }
}

export async function POST(req: NextRequest) {
  if (!INTERNAL.trim()) {
    return NextResponse.json({ error: 'api_origin_missing' }, { status: 503 })
  }
  const siteUrl = getPublicSiteUrl()
  if (!siteUrl.trim()) {
    return NextResponse.json({ error: 'site_url_missing' }, { status: 503 })
  }

  const token = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '').trim()
  if (!token) return NextResponse.json({ error: 'auth_required' }, { status: 401 })

  const auth = await verifyAdminToken(token, 'admin.integrations.write')
  if (!auth.ok) {
    return NextResponse.json(
      { error: auth.status === 403 ? 'forbidden' : 'unauthorized' },
      { status: auth.status },
    )
  }

  let body: { category_code?: string; limit?: number; page?: number } = {}
  try {
    const raw = await req.text()
    if (raw.trim()) body = JSON.parse(raw) as typeof body
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const site = await loadSiteSettings(token)
  const status = merchantConfigStatus(site)
  if (!status.ready) {
    return NextResponse.json(
      {
        error: 'merchant_not_configured',
        status,
        hint: 'Merchant Account ID, Data Source ID ve servis hesabı JSON gerekli.',
      },
      { status: 422 },
    )
  }

  const limit = Math.min(Math.max(body.limit ?? 50, 1), 200)
  const page = Math.max(body.page ?? 1, 1)
  const categoryCode = body.category_code?.trim() || undefined
  const enabled = new Set(
    (site.enabled_category_codes ?? []).map((c) => c.trim().toLowerCase()).filter(Boolean),
  )

  const listings = await fetchPublishedListingsForMerchant(token, {
    categoryCode,
    limit,
    page,
  })

  const filtered =
    enabled.size > 0
      ? listings.filter((l) => enabled.has(l.category_code.toLowerCase()))
      : listings

  const results = []
  for (const row of filtered) {
    const payload = await enrichListingForMerchant(row, siteUrl)
    if (!payload) {
      results.push({ listing_id: row.id, ok: false, error: 'listing_missing_price_or_image' })
      continue
    }

    const pushed = await pushListingToMerchant(payload, site)
    if (pushed.ok && pushed.offer_id) {
      try {
        await recordMerchantPush(token, row.id, pushed.offer_id)
      } catch {
        /* ignore db tracking failure */
      }
    }
    results.push(pushed)

    // Merchant API hız sınırı — kısa bekleme
    await new Promise((r) => setTimeout(r, 150))
  }

  const okCount = results.filter((r) => r.ok).length
  return NextResponse.json({
    ok: okCount > 0 && okCount === results.length,
    page,
    limit,
    scanned: filtered.length,
    pushed: okCount,
    failed: results.length - okCount,
    results,
  })
}
