/**
 * Google Merchant API (products v1) — Product Input insert.
 * Kimlik: sunucu ortamındaki servis hesabı JSON (`GOOGLE_MERCHANT_SERVICE_ACCOUNT_JSON`).
 */

import { createSign } from 'crypto'
import { getPublicSiteUrl } from '@/lib/site-branding-seo'
import { preferListingGalleryFullAsset } from '@/lib/listing-gallery-display-url'
import { listingPublicUrl } from '@/lib/social-auto-post'

const MERCHANT_API = 'https://merchantapi.googleapis.com/products/v1'
const OAUTH_TOKEN_URL = 'https://oauth2.googleapis.com/token'
const CONTENT_SCOPE = 'https://www.googleapis.com/auth/content'

export type GoogleMerchantSiteSettings = {
  merchant_account_id?: string
  data_source_id?: string
  content_language?: string
  feed_label?: string
  target_country?: string
  /** Boş = tüm yayınlanmış kategoriler */
  enabled_category_codes?: string[]
}

export type MerchantListingPayload = {
  id: string
  slug: string
  title: string
  description?: string | null
  category_code: string
  currency_code?: string | null
  price_from?: string | null
  featured_image_url?: string | null
  thumbnail_url?: string | null
}

export type MerchantPushResult = {
  listing_id: string
  ok: boolean
  offer_id?: string
  merchant_product_name?: string
  error?: string
}

type ServiceAccount = {
  client_email: string
  private_key: string
}

function base64url(input: string | Buffer): string {
  const buf = typeof input === 'string' ? Buffer.from(input, 'utf8') : input
  return buf.toString('base64url')
}

function parseServiceAccountJson(raw: string): ServiceAccount | null {
  const trimmed = raw.trim()
  if (!trimmed) return null
  try {
    const parsed = JSON.parse(trimmed) as { client_email?: string; private_key?: string }
    const email = parsed.client_email?.trim() ?? ''
    const key = parsed.private_key?.trim() ?? ''
    if (!email || !key) return null
    return { client_email: email, private_key: key }
  } catch {
    return null
  }
}

export function loadServiceAccountFromEnv(): ServiceAccount | null {
  const inline = process.env.GOOGLE_MERCHANT_SERVICE_ACCOUNT_JSON?.trim() ?? ''
  if (inline) {
    const sa = parseServiceAccountJson(inline)
    if (sa) return sa
  }
  return null
}

export function resolveMerchantConfig(
  site: GoogleMerchantSiteSettings,
): { accountId: string; dataSourceId: string; contentLanguage: string; feedLabel: string } | null {
  const accountId =
    site.merchant_account_id?.trim() ||
    process.env.GOOGLE_MERCHANT_ACCOUNT_ID?.trim() ||
    ''
  const dataSourceId =
    site.data_source_id?.trim() ||
    process.env.GOOGLE_MERCHANT_DATA_SOURCE_ID?.trim() ||
    ''
  if (!accountId || !dataSourceId) return null
  return {
    accountId,
    dataSourceId,
    contentLanguage: (site.content_language?.trim() || 'tr').toLowerCase(),
    feedLabel: (site.feed_label?.trim() || site.target_country?.trim() || 'TR').toUpperCase(),
  }
}

export function merchantConfigStatus(site: GoogleMerchantSiteSettings = {}): {
  service_account: boolean
  merchant_account_id: boolean
  data_source_id: boolean
  ready: boolean
} {
  const sa = loadServiceAccountFromEnv()
  const cfg = resolveMerchantConfig(site)
  return {
    service_account: !!sa,
    merchant_account_id: !!cfg?.accountId,
    data_source_id: !!cfg?.dataSourceId,
    ready: !!sa && !!cfg,
  }
}

let cachedToken: { value: string; expiresAt: number } | null = null

async function getAccessToken(sa: ServiceAccount): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  if (cachedToken && cachedToken.expiresAt > now + 60) return cachedToken.value

  const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const payload = base64url(
    JSON.stringify({
      iss: sa.client_email,
      scope: CONTENT_SCOPE,
      aud: OAUTH_TOKEN_URL,
      iat: now,
      exp: now + 3600,
    }),
  )
  const unsigned = `${header}.${payload}`
  const sign = createSign('RSA-SHA256')
  sign.update(unsigned)
  sign.end()
  const signature = sign.sign(sa.private_key, 'base64url')
  const jwt = `${unsigned}.${signature}`

  const res = await fetch(OAUTH_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
    cache: 'no-store',
  })
  if (!res.ok) {
    const err = await res.text().catch(() => '')
    throw new Error(`google_oauth_failed:${res.status}:${err.slice(0, 200)}`)
  }
  const data = (await res.json()) as { access_token?: string; expires_in?: number }
  const token = data.access_token?.trim() ?? ''
  if (!token) throw new Error('google_oauth_missing_token')
  cachedToken = {
    value: token,
    expiresAt: now + (data.expires_in ?? 3600),
  }
  return token
}

function parsePriceAmount(priceRaw: string | null | undefined): { micros: string; currency: string } | null {
  const raw = (priceRaw ?? '').trim().replace(/\s/g, '').replace(',', '.')
  if (!raw) return null
  const n = Number.parseFloat(raw)
  if (!Number.isFinite(n) || n <= 0) return null
  const micros = Math.round(n * 1_000_000)
  return { micros: String(micros), currency: 'TRY' }
}

function absoluteImageUrl(siteUrl: string, src: string | null | undefined): string {
  const s = (src ?? '').trim()
  if (!s) return ''
  const base = siteUrl.replace(/\/$/, '')
  if (s.startsWith('https://')) return preferListingGalleryFullAsset(s)
  if (s.startsWith('http://')) {
    try {
      const u = new URL(s)
      u.protocol = 'https:'
      return preferListingGalleryFullAsset(u.toString())
    } catch {
      return ''
    }
  }
  const path = s.startsWith('/') ? s : `/${s}`
  return preferListingGalleryFullAsset(`${base}${path}`)
}

/** Google ürün kategorisi — seyahat ilanları için yaklaşık eşleme */
function googleProductCategory(categoryCode: string): string {
  switch (categoryCode) {
    case 'hotel':
    case 'holiday_home':
    case 'yacht_charter':
      return '2092'
    case 'tour':
    case 'cruise':
    case 'hajj':
      return '2092'
    case 'activity':
    case 'event':
      return '2092'
    case 'car_rental':
    case 'transfer':
    case 'ferry':
    case 'flight':
      return '2092'
    default:
      return '2092'
  }
}

function stripHtml(text: string): string {
  return text
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function buildProductInput(
  listing: MerchantListingPayload,
  cfg: { contentLanguage: string; feedLabel: string },
): {
  offerId: string
  contentLanguage: string
  feedLabel: string
  productAttributes: Record<string, unknown>
} | null {
  const siteUrl = getPublicSiteUrl()
  if (!siteUrl.trim()) return null

  const title = listing.title.trim()
  if (!title) return null

  const link = listingPublicUrl(listing.category_code, listing.slug)
  const imageLink =
    absoluteImageUrl(siteUrl, listing.featured_image_url) ||
    absoluteImageUrl(siteUrl, listing.thumbnail_url)
  if (!imageLink.startsWith('https://')) return null

  const price = parsePriceAmount(listing.price_from)
  if (!price) return null

  const currency = (listing.currency_code?.trim() || price.currency || 'TRY').toUpperCase()
  const description = stripHtml((listing.description ?? title).slice(0, 5000))

  return {
    offerId: listing.id,
    contentLanguage: cfg.contentLanguage,
    feedLabel: cfg.feedLabel,
    productAttributes: {
      title,
      description,
      link,
      imageLink,
      availability: 'IN_STOCK',
      condition: 'NEW',
      googleProductCategory: googleProductCategory(listing.category_code),
      price: {
        amountMicros: price.micros,
        currencyCode: currency,
      },
      customLabel0: listing.category_code,
      identifierExists: false,
    },
  }
}

export async function insertMerchantProductInput(
  accountId: string,
  dataSourceId: string,
  productInput: {
    offerId: string
    contentLanguage: string
    feedLabel: string
    productAttributes: Record<string, unknown>
  },
): Promise<{ name: string; offerId: string }> {
  const sa = loadServiceAccountFromEnv()
  if (!sa) throw new Error('service_account_not_configured')

  const token = await getAccessToken(sa)
  const dataSource = `accounts/${accountId}/dataSources/${dataSourceId}`
  const url = `${MERCHANT_API}/accounts/${encodeURIComponent(accountId)}/productInputs:insert?dataSource=${encodeURIComponent(dataSource)}`

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(productInput),
    cache: 'no-store',
  })

  const text = await res.text()
  let parsed: { name?: string; offerId?: string; error?: { message?: string } } = {}
  try {
    parsed = JSON.parse(text) as typeof parsed
  } catch {
    /* ignore */
  }

  if (!res.ok) {
    const msg = parsed.error?.message ?? text.slice(0, 300)
    throw new Error(`merchant_api_${res.status}:${msg}`)
  }

  return {
    name: parsed.name ?? `${dataSource}/productInputs/${productInput.offerId}`,
    offerId: parsed.offerId ?? productInput.offerId,
  }
}

export async function pushListingToMerchant(
  listing: MerchantListingPayload,
  site: GoogleMerchantSiteSettings,
): Promise<MerchantPushResult> {
  const cfg = resolveMerchantConfig(site)
  if (!cfg) {
    return { listing_id: listing.id, ok: false, error: 'merchant_config_incomplete' }
  }

  const input = buildProductInput(listing, cfg)
  if (!input) {
    return { listing_id: listing.id, ok: false, error: 'listing_not_merchant_ready' }
  }

  try {
    const pushed = await insertMerchantProductInput(cfg.accountId, cfg.dataSourceId, input)
    return {
      listing_id: listing.id,
      ok: true,
      offer_id: pushed.offerId,
      merchant_product_name: pushed.name,
    }
  } catch (e) {
    return {
      listing_id: listing.id,
      ok: false,
      error: e instanceof Error ? e.message : String(e),
    }
  }
}
