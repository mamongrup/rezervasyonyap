/**
 * POST /api/google/merchant/push
 * Body: { listing_id: string } | { listing_ids: string[] }
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

  let body: { listing_id?: string; listing_ids?: string[] }
  try {
    body = (await req.json()) as typeof body
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const ids = [
    ...(body.listing_ids ?? []),
    ...(body.listing_id ? [body.listing_id] : []),
  ]
    .map((id) => id.trim())
    .filter(Boolean)

  if (!ids.length) {
    return NextResponse.json({ error: 'listing_id_required' }, { status: 400 })
  }

  const site = await loadSiteSettings(token)
  const status = merchantConfigStatus(site)
  if (!status.ready) {
    return NextResponse.json(
      {
        error: 'merchant_not_configured',
        status,
        hint: 'SEO → Merchant sayfasından Merchant Account ID ve Data Source ID girin; sunucuda GOOGLE_MERCHANT_SERVICE_ACCOUNT_JSON tanımlayın.',
      },
      { status: 422 },
    )
  }

  const results = []
  for (const listingId of ids) {
    let manageRow = (
      await fetchPublishedListingsForMerchant(token, { limit: 500 })
    ).find((l) => l.id === listingId)

    if (!manageRow) {
      const searchRes = await fetch(
        `${INTERNAL}/api/v1/catalog/manage-listings?search=${encodeURIComponent(listingId)}&per_page=20`,
        { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' },
      )
      if (searchRes.ok) {
        const data = (await searchRes.json()) as {
          listings: { id: string; slug: string; title: string; category_code: string; status: string; currency_code?: string }[]
        }
        manageRow = data.listings.find((l) => l.id === listingId && l.status === 'published')
      }
    }

    if (!manageRow) {
      results.push({ listing_id: listingId, ok: false, error: 'listing_not_found_or_not_published' })
      continue
    }

    const payload = await enrichListingForMerchant(manageRow, siteUrl)
    if (!payload) {
      results.push({ listing_id: listingId, ok: false, error: 'listing_missing_price_or_image' })
      continue
    }

    const pushed = await pushListingToMerchant(payload, site)
    if (pushed.ok && pushed.offer_id) {
      try {
        await recordMerchantPush(token, listingId, pushed.offer_id)
      } catch {
        /* DB kaydı başarısız olsa da API push başarılı */
      }
    }
    results.push(pushed)
  }

  const okCount = results.filter((r) => r.ok).length
  return NextResponse.json({
    ok: okCount === results.length,
    pushed: okCount,
    failed: results.length - okCount,
    results,
  })
}
