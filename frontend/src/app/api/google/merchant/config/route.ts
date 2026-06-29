/**
 * GET /api/google/merchant/config — yapılandırma durumu (gizli anahtar yok).
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminToken } from '@/lib/security'
import { merchantConfigStatus, type GoogleMerchantSiteSettings } from '@/lib/google-merchant-api'

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

export async function GET(req: NextRequest) {
  if (!INTERNAL.trim()) {
    return NextResponse.json({ error: 'api_origin_missing' }, { status: 503 })
  }

  const token = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '').trim()
  if (!token) return NextResponse.json({ error: 'auth_required' }, { status: 401 })

  const auth = await verifyAdminToken(token, 'admin.integrations.read')
  if (!auth.ok) {
    return NextResponse.json(
      { error: auth.status === 403 ? 'forbidden' : 'unauthorized' },
      { status: auth.status },
    )
  }

  const site = await loadSiteSettings(token)
  const status = merchantConfigStatus(site)

  return NextResponse.json({
    status,
    settings: {
      merchant_account_id:
        site.merchant_account_id?.trim() ||
        process.env.GOOGLE_MERCHANT_ACCOUNT_ID?.trim() ||
        '',
      data_source_id:
        site.data_source_id?.trim() ||
        process.env.GOOGLE_MERCHANT_DATA_SOURCE_ID?.trim() ||
        '',
      content_language: site.content_language?.trim() || 'tr',
      feed_label: site.feed_label?.trim() || 'TR',
      enabled_category_codes: site.enabled_category_codes ?? [],
    },
  })
}
