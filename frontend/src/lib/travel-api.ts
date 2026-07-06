/**
 * Yönetim API istemcisi — rezervasyon, kimlik, katalog, destek, ödeme (PayTR) uçları.
 * PostgreSQL tabanlı backend; üretimde ortam değişkenleri ve güvenli anahtar yönetimi kullanın.
 */

import { apiOriginForFetch } from '@/lib/api-origin'
import { MAX_AI_UPSTREAM_MS } from '@/lib/ai-upstream-timeouts'
import { profileFieldsFromAuthUser } from '@/lib/auth-display'
import { setStoredAuthProfile } from '@/lib/auth-storage'
import { formatLocalYmd } from '@/lib/date-format-local'
import { parseLenientJson } from '@/lib/json-parse'
import {
  parseHolidayHomeFaqTemplatePayload,
  type HolidayHomeFaqTemplatePayload,
  withHolidayHomeFaqTemplateDefaults,
} from '@/lib/holiday-home-faq-merge'
import {
  type HolidayHomePropertyTypeItem,
  parseHolidayHomePropertyTypesPayload,
} from '@/lib/holiday-property-type-options'
import {
  parseHotelValidCampaignsPayload,
  type HotelValidCampaignsPayload,
} from '@/lib/hotel-valid-campaigns'

const base = () => apiOriginForFetch()

export type { HolidayHomePropertyTypeItem }

/** Uzun AI admin çağrıları — tarayıcı iptali; `upstreamTimeoutMs: 0` = süre sınırı yok. */
function fetchInitUpstreamOptional(upstreamTimeoutMs?: number): Pick<RequestInit, 'signal'> {
  if (upstreamTimeoutMs === 0) return {}
  const raw =
    upstreamTimeoutMs != null && Number.isFinite(upstreamTimeoutMs) && upstreamTimeoutMs > 0
      ? Math.round(Number(upstreamTimeoutMs))
      : MAX_AI_UPSTREAM_MS
  const clamped = Math.max(5000, Math.min(MAX_AI_UPSTREAM_MS, raw))
  if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') {
    return { signal: AbortSignal.timeout(clamped) }
  }
  return {}
}

async function json<T>(res: Response): Promise<T> {
  // Clone before reading: Next.js fetch deduplication may return the same
  // Response object to concurrent callers; cloning ensures each reads its own stream.
  const text = await res.clone().text()
  if (!text) throw new Error('empty_response')
  try {
    return parseLenientJson(text) as T
  } catch {
    throw new Error(`invalid_json_response_${res.status}`)
  }
}

function coerceInt(v: unknown, fallback = 0): number {
  if (typeof v === 'number' && Number.isFinite(v)) return Math.trunc(v)
  const n = Number.parseInt(String(v ?? '').trim(), 10)
  return Number.isFinite(n) ? n : fallback
}

function coerceOptionalInt(v: unknown): number | undefined {
  if (v === undefined || v === null) return undefined
  if (typeof v === 'number' && Number.isFinite(v)) return Math.trunc(v)
  const n = Number.parseInt(String(v).trim(), 10)
  return Number.isFinite(n) ? n : undefined
}

function stringRecordInts(raw: unknown): Record<string, number> {
  const out: Record<string, number> = {}
  if (!raw || typeof raw !== 'object') return out
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    out[k] = coerceInt(v)
  }
  return out
}

/** G2.1 — sepet oluşturulurken TCMB (currency_rates) anlık kopyası */
export type FxLockSnapshot = {
  policy: string
  quote_currency: string
  locked_at: string
  rates_to_try: Record<string, number>
}

export type CreateCartRes = {
  id: string
  currency_code: string
  fx_lock?: FxLockSnapshot
}

export type CartDetail = {
  id: string
  currency_code: string
  fx_locked_at: string | null
  /** API bazen gömülü JSON string döner — parse edin */
  fx_lock: FxLockSnapshot | string | null
  lines: {
    id: string
    listing_id: string
    quantity: string
    unit_price: string
    starts_on: string
    ends_on: string
    line_total: string
  }[]
}
export type CheckoutRes = {
  reservation_id: string
  public_code: string
  status: string
  /** PayTR payment_amount (kuruş, string) */
  payment_amount: string
  currency_code: string
}

export type PaytrTokenRes = {
  status: string
  token: string
  iframe_url: string
}

export async function createCart(currencyCode: string): Promise<CreateCartRes> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/carts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ currency_code: currencyCode }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `cart_${res.status}`)
  }
  return json<CreateCartRes>(res)
}

// ── Sepete kupon iliştirme (Faz A) ────────────────────────────────────────────
export type CouponPreview = {
  ok: boolean
  code: string
  discount_type: 'percent' | 'fixed' | string
  discount_value: string
  discount_amount: string
}

export type CartTotals = {
  subtotal: string
  discount_amount: string
  total: string
  coupon: { code: string; discount_type: string; discount_value: string } | null
}

/** Sepetsiz ön doğrulama. Sepet altyapısına bağlanmadan kullanıcıya geri bildirim verir. */
export async function validateCouponPublic(
  code: string,
  subtotal: number | string = 0,
): Promise<CouponPreview> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const url = new URL(`${b}/api/v1/public/coupons/validate`)
  url.searchParams.set('code', code)
  url.searchParams.set('subtotal', String(subtotal))
  const res = await fetch(url.toString())
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `coupon_${res.status}`)
  }
  return json(res)
}

export async function applyCouponToCart(
  cartId: string,
  code: string,
): Promise<CouponPreview & { subtotal: string; total: string }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(
    `${b}/api/v1/carts/${encodeURIComponent(cartId)}/apply-coupon`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    },
  )
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `apply_${res.status}`)
  }
  return json(res)
}

export async function removeCouponFromCart(cartId: string): Promise<{ ok: boolean }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(
    `${b}/api/v1/carts/${encodeURIComponent(cartId)}/coupon`,
    { method: 'DELETE' },
  )
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `coupon_${res.status}`)
  }
  return json(res)
}

export async function getCartTotals(cartId: string): Promise<CartTotals> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(
    `${b}/api/v1/carts/${encodeURIComponent(cartId)}/totals`,
  )
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `totals_${res.status}`)
  }
  return json(res)
}

// ── Listing perks (Faz D + E): instant_book + mobile_discount + super_host ─
export type ListingPerks = {
  instant_book: boolean
  mobile_discount_percent: number
  super_host: boolean
}

export async function getListingPerks(listingId: string): Promise<ListingPerks> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(
    `${b}/api/v1/public/listings/${encodeURIComponent(listingId)}/perks`,
    { cache: 'no-store' },
  )
  if (!res.ok) throw new Error(`perks_${res.status}`)
  return json(res)
}

export type PublicHotelRoom = {
  id: string
  name: string
  capacity: string | null
  board_type: string | null
  meta_json: string
  unit_count?: number
}

/** Vitrin için otel oda listesi — auth gerektirmez. Boş dönerse vitrinin demo akışı çalışır. */
export async function getPublicHotelRooms(
  listingId: string,
): Promise<{ rooms: PublicHotelRoom[] }> {
  const b = base()
  if (!b) return { rooms: [] }
  try {
    const res = await fetch(
      `${b}/api/v1/verticals/listings/${encodeURIComponent(listingId)}/hotel-rooms`,
      { cache: 'no-store' },
    )
    if (!res.ok) return { rooms: [] }
    const data = await json<{ rooms?: PublicHotelRoom[] }>(res)
    return { rooms: Array.isArray(data.rooms) ? data.rooms : [] }
  } catch {
    return { rooms: [] }
  }
}

/** Vitrin "Bu ilanı bildir" formundan gönderilen şikayet. */
export async function submitListingReport(
  listingId: string,
  body: { reason_code: string; message?: string; reporter_email?: string },
): Promise<{ ok: boolean }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(
    `${b}/api/v1/public/listings/${encodeURIComponent(listingId)}/report`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
  )
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `report_${res.status}`)
  }
  return json(res)
}

export type PublicListingAttribute = {
  group_code: string
  key: string
  value_json: string
}

/** Vitrin için listing_attributes satırlarını çeker (auth gerektirmez). */
export async function getPublicListingAttributes(
  listingId: string,
): Promise<{ values: PublicListingAttribute[]; icons?: Record<string, string> }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(
    `${b}/api/v1/public/listings/${encodeURIComponent(listingId)}/attributes`,
    { cache: 'no-store' },
  )
  if (!res.ok) throw new Error(`public_attrs_${res.status}`)
  return json(res)
}

/** Vitrin detay — attributes API hata/boş yanıtta sayfa kırılmasın */
export async function fetchPublicListingAttributesSafe(
  listingId: string,
): Promise<{ values: PublicListingAttribute[]; icons: Record<string, string> }> {
  try {
    const attrs = await getPublicListingAttributes(listingId)
    return {
      values: Array.isArray(attrs.values) ? attrs.values : [],
      icons: attrs.icons ?? {},
    }
  } catch {
    return { values: [], icons: {} }
  }
}

/** value_json string'inden boolean true tespit eder; "true", "1", `{value:true}` gibi serbest formatları kabul eder. */
export function isAttributeValueTrue(raw: string): boolean {
  const v = (raw ?? '').trim()
  if (!v) return false
  if (v === 'true' || v === '"true"' || v === '1' || v === '"1"') return true
  try {
    const p = JSON.parse(v)
    if (p === true || p === 1) return true
    if (p && typeof p === 'object') {
      const o = p as Record<string, unknown>
      if (o.value === true || o.value === 1 || o.value === 'true') return true
      if (o.enabled === true || o.enabled === 1) return true
    }
  } catch {
    /* ignore */
  }
  return false
}

export async function patchListingPerks(
  authToken: string,
  listingId: string,
  body: Partial<{ instant_book: boolean; mobile_discount_percent: number }>,
  params?: { organizationId?: string },
): Promise<{ ok: boolean }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(
    `${b}/api/v1/listings/${encodeURIComponent(listingId)}/perks${catalogListingQs(params)}`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify(body),
    },
  )
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `perks_patch_${res.status}`)
  }
  return json(res)
}

export async function getCart(cartId: string): Promise<CartDetail> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/carts/${encodeURIComponent(cartId)}`)
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `cart_get_${res.status}`)
  }
  return json(res)
}

// ─── Turna canlı uçuş ───────────────────────────────────────────────────────

export type TurnaFlightSession = {
  session_id: string
  session_token: string
}

export type TurnaFlightSearchParams = {
  origin: string
  destination: string
  departure_date: string
  origin_is_city?: boolean
  destination_is_city?: boolean
  adults?: number
  children?: number
  infants?: number
  cabin_class?: string
  only_directs?: boolean
}

export type TurnaFlightSearchResult = {
  ok: boolean
  turna_raw: string
  session: TurnaFlightSession
  listing_id: string | null
  route_ref: string
  search_response_url?: string | null
  has_inventory?: boolean
}

async function turnaFlightPost<T>(path: string, body: unknown): Promise<T> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/flights/turna/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error((data as { error?: string }).error ?? `turna_${path}_${res.status}`)
  }
  return data as T
}

export async function searchTurnaFlights(
  params: TurnaFlightSearchParams,
): Promise<TurnaFlightSearchResult> {
  return turnaFlightPost('search', params)
}

export async function allocateTurnaFlight(
  body: TurnaFlightSearchParams & {
    session_id: string
    session_token: string
    allocate_form: string
  },
): Promise<{ ok: boolean; turna_raw: string; session: TurnaFlightSession }> {
  return turnaFlightPost('allocate', body)
}

export async function reserveTurnaFlight(body: {
  session_id: string
  session_token: string
  reserve_form: string
}): Promise<{ ok: boolean; turna_raw: string; session: TurnaFlightSession }> {
  return turnaFlightPost('reserve', body)
}

export async function bookTurnaFlight(body: {
  session_id: string
  session_token: string
  reserve_form: string
  payment_form?: string
  checkout_form?: string
}): Promise<{
  ok: boolean
  reserve_raw?: string
  payment_raw?: string
  checkout_raw?: string
  session: TurnaFlightSession
}> {
  return turnaFlightPost('book', body)
}

export async function addCartLine(
  cartId: string,
  body: {
    listing_id: string
    quantity: number
    starts_on: string
    ends_on: string
    unit_price: string
    /** Turna allocate snapshot vb. */
    meta_json?: string
    /** Verilirse ilan kategorisi bu acente için onaylı olmalı (`agency_category_grants`). */
    agency_organization_id?: string
  },
  /** Acente sepetleri için backend `user_roles` doğrulaması yapar; token şarttır. */
  authToken?: string,
): Promise<{ id: string; cart_id: string }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (authToken) headers.Authorization = `Bearer ${authToken}`
  const res = await fetch(`${b}/api/v1/carts/${cartId}/lines`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `line_${res.status}`)
  }
  return json(res)
}

export async function checkoutCart(
  cartId: string,
  body: {
    guest_email: string
    guest_name: string
    guest_phone?: string
    hold_minutes?: number
    /** Geçerli `organizations.id` ve `org_type = 'agency'` */
    agency_organization_id?: string
    /** Kategori (ilan) sözleşmesi onayı. */
    contract_accepted: boolean
    /** Site / kurum genel şartları — yalnızca ilgili şablon varsa zorunlu. */
    general_contract_accepted?: boolean
    /** Satış şartları — yalnızca ilgili şablon varsa zorunlu. */
    sales_contract_accepted?: boolean
    /** Örn. tr — rezervasyonda snapshot dili. */
    contract_locale?: string
    /** Provizyon: 'full' | 'partial' (varsayılan 'full') */
    payment_type?: 'full' | 'partial'
    /** card | bank_transfer | western_union | ria */
    payment_channel?: string
    /** Misafir listesi, fatura, ödeme kanalı JSON */
    checkout_meta_json?: string
    /** Taksit sayısı (1-12, varsayılan 1) */
    installments?: number
  },
  /** Acente checkout'larında backend `user_roles` doğrulaması yapar; token şarttır. */
  authToken?: string,
): Promise<CheckoutRes & { payment_type?: string }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (authToken) headers.Authorization = `Bearer ${authToken}`
  const res = await fetch(`${b}/api/v1/carts/${cartId}/checkout`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `checkout_${res.status}`)
  }
  return json<CheckoutRes>(res)
}

/** PayTR dokümantasyonu: `[[ "Ürün adı", "12.34", adet ], ...]` → UTF-8 → Base64 */
export function encodePaytrUserBasket(rows: [string, string, number][]): string {
  const s = JSON.stringify(rows)
  return btoa(unescape(encodeURIComponent(s)))
}

/** Müşteri IP (PayTR zorunlu alan). Üretimde doğru IP için tercih edin.
 *
 * Notlar:
 * - `cache: 'no-store'` — IP yanıtı oturuma özgü, Next.js fetch cache'ine yazılmamalı.
 * - 3 sn timeout (`AbortController`) — `ipify` erişilemezse checkout sayfası asılı kalmasın.
 * - JSON parse hatasında fallback IP dön. */
export async function fetchPublicIp(): Promise<string> {
  const fallback = process.env.NEXT_PUBLIC_PAYTR_FALLBACK_IP ?? '127.0.0.1'
  const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null
  const t = ctrl ? setTimeout(() => ctrl.abort(), 3000) : null
  try {
    const r = await fetch('https://api.ipify.org?format=json', {
      cache: 'no-store',
      signal: ctrl?.signal,
    })
    if (!r.ok) return fallback
    const j = (await r.json().catch(() => ({}))) as { ip?: string }
    return typeof j.ip === 'string' && j.ip.length > 0 ? j.ip : fallback
  } catch {
    return fallback
  } finally {
    if (t) clearTimeout(t)
  }
}

export type PaytrIframeTokenInput = {
  user_ip: string
  merchant_oid: string
  email: string
  /** kuruş, örn. "10050" = 100,50 TL */
  payment_amount: string
  /** Base64 sepet JSON */
  user_basket: string
  user_name?: string
  user_phone?: string
  merchant_ok_url?: string
  merchant_fail_url?: string
  currency?: string
  no_installment?: string
  max_installment?: string
  timeout_limit?: string
  debug_on?: string
  lang?: string
}

/**
 * PayTR iFrame 1. adım — token.
 * `merchant_oid` = **rezervasyon UUID** (Bildirim URL ile aynı).
 */
export async function paytrIframeToken(input: PaytrIframeTokenInput): Promise<PaytrTokenRes> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/integrations/paytr/iframe-token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `paytr_${res.status}`)
  }
  return json<PaytrTokenRes>(res)
}

// --- Liste sırası: 1 i18n, 2 para birimi, 3 üyelik (çekirdek API) ---

export type LocaleRow = {
  id: number
  code: string
  name: string
  is_rtl: boolean
  is_active: boolean
}

export async function listLocales(): Promise<{ locales: LocaleRow[] }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/i18n/locales`)
  if (!res.ok) throw new Error(`i18n_locales_${res.status}`)
  return json(res)
}

export async function getTranslationBundle(locale: string): Promise<{
  locale: string
  namespaces: Record<string, Record<string, string>>
}> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const q = new URLSearchParams({ locale })
  const res = await fetch(`${b}/api/v1/i18n/bundle?${q}`)
  if (!res.ok) throw new Error(`i18n_bundle_${res.status}`)
  return json(res)
}

export async function createLocale(
  token: string,
  body: {
    code: string
    name: string
    is_rtl?: boolean
    is_active?: boolean
  },
): Promise<LocaleRow> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/i18n/locales`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `i18n_locale_create_${res.status}`)
  }
  return json(res)
}

export type TranslationNamespaceRow = { id: number; code: string }

export async function listTranslationNamespaces(): Promise<{ namespaces: TranslationNamespaceRow[] }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/i18n/namespaces`)
  if (!res.ok) throw new Error(`i18n_namespaces_${res.status}`)
  return json(res)
}

export async function createTranslationNamespace(token: string, body: { code: string }): Promise<TranslationNamespaceRow> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/i18n/namespaces`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `i18n_namespace_create_${res.status}`)
  }
  return json(res)
}

export async function upsertTranslation(
  token: string,
  body: {
    namespace: string
    key: string
    locale: string
    value: string
  },
): Promise<{ ok: boolean; namespace: string; key: string; locale: string }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/i18n/translations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `i18n_translation_upsert_${res.status}`)
  }
  return json(res)
}

export async function refreshTcmbRates(token: string): Promise<{
  ok: boolean
  inserted: number
  fetched_at: string
  pairs_seen: number
}> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/currency/rates/refresh`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `currency_refresh_${res.status}`)
  }
  return json(res)
}

export type CurrencyRow = {
  code: string
  name: string
  symbol: string
  decimal_places: number
  is_active: boolean
  /** DB `sort_order` — önyüz / header listesi sırası */
  sort_order?: number
}

/** GET — kayıtlı para birimleri (herkese açık). */
export async function listCurrencies(): Promise<{ currencies: CurrencyRow[] }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/currency/currencies`)
  if (!res.ok) throw new Error(`currency_list_${res.status}`)
  return json(res)
}

/** POST — para birimi gösterim sırası (`codes` = yeni sıra, tüm satırlar). PUT ile aynı uç; POST proxy uyumu için. */
export async function putCurrencyOrder(token: string, codes: string[]): Promise<{ ok: boolean }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const url = `${b}/api/v1/currency/currencies/order`
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  } as const
  const body = JSON.stringify({ codes })
  let res = await fetch(url, { method: 'POST', headers, body })
  if (res.status === 404) {
    res = await fetch(url, { method: 'PUT', headers, body })
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    const apiErr = (err as { error?: string }).error
    if (apiErr) throw new Error(apiErr)
    if (res.status === 404) {
      throw new Error(
        'Para sırası API bulunamadı (404). Gleam backend’i son kodla derleyip yeniden başlatın; NEXT_PUBLIC_API_URL yalnızca kök olmalı (örn. http://127.0.0.1:8080, /api/v1 eklemeyin).',
      )
    }
    throw new Error(`currency_order_${res.status}`)
  }
  return json(res)
}

export type ProductCategoryRow = {
  id: number
  code: string
  name_key: string
  parent_id: number | null
  sort_order: number
  is_active: boolean
  allows_manual_source: boolean
  allows_api_source: boolean
}

/** GET — ürün kategorileri (yönetim menüsü / vitrin). `active_only`: yalnız yayında modüller. */
export async function listProductCategories(opts?: {
  active_only?: boolean
}): Promise<{ categories: ProductCategoryRow[] }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const q = opts?.active_only ? '?active_only=true' : ''
  const res = await fetch(`${b}/api/v1/catalog/product-categories${q}`)
  if (!res.ok) throw new Error(`product_categories_${res.status}`)
  return json<{ categories: ProductCategoryRow[] }>(res)
}

export type ManageListingRow = {
  id: string
  slug: string
  status: string
  currency_code: string
  category_code: string
  title: string
  commission_percent: string
  prepayment_amount: string
  prepayment_percent: string
  created_at: string
  listing_source: string
  share_to_social: boolean
  allow_ai_caption: boolean
  /** Seçili kategori sözleşmesi (havuz); boş ise atanmamış. */
  category_contract_id: string
  /** Sosyal tasarım ipucu için virgülle tema kodları (`sea_view,luxury,family`). */
  theme_codes?: string
}

export type ManageCatalogListingsResult = {
  listings: ManageListingRow[]
  total: number
  page: number
  per_page: number
}

/** Katalog yönetim listesi — tedarikçi / personel / acente kendi kurumu; yönetici `organizationId` zorunlu. */
export async function listManageCatalogListings(
  token: string,
  params: {
    categoryCode?: string
    search?: string
    organizationId?: string
    /** Panel dili ile uyumlu başlık (`listing_translations`). Varsayılan: tr */
    titleLocale?: string
    /** Sayfa (1 tabanlı). API varsayılanı 1. */
    page?: number
    /** Sayfa başına kayıt. API varsayılanı 200 (üst sınır 500). */
    perPage?: number
  },
): Promise<ManageCatalogListingsResult> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const u = new URLSearchParams()
  if (params.categoryCode) u.set('category_code', params.categoryCode)
  if (params.search?.trim()) u.set('search', params.search.trim())
  if (params.organizationId?.trim()) u.set('organization_id', params.organizationId.trim())
  if (params.titleLocale?.trim()) u.set('title_locale', params.titleLocale.trim().toLowerCase())
  if (params.page != null && params.page >= 1) u.set('page', String(Math.floor(params.page)))
  if (params.perPage != null && params.perPage >= 1) u.set('per_page', String(Math.floor(params.perPage)))
  const qs = u.toString()
  const res = await fetch(`${b}/api/v1/catalog/manage-listings${qs ? `?${qs}` : ''}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `manage_listings_${res.status}`)
  }
  const data = await json<{
    listings: ManageListingRow[]
    total?: number
    page?: number
    per_page?: number
  }>(res)
  const listings = data.listings ?? []
  return {
    listings,
    total: data.total ?? listings.length,
    page: data.page ?? 1,
    per_page: data.per_page ?? listings.length,
  }
}

export type ManageListingDeleteBulkResult = {
  ok: boolean
  deleted: number
  deleted_ids: string[]
  failed: { listing_id: string; error: string }[]
}

function manageListingsOrgQuery(organizationId?: string): string {
  const o = organizationId?.trim()
  return o ? `?organization_id=${encodeURIComponent(o)}` : ''
}

/** Kalıcı silme — rezervasyon satırı varsa API reddeder. */
export async function deleteManageCatalogListing(
  token: string,
  listingId: string,
  organizationId?: string,
): Promise<{ ok: boolean; deleted: number }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(
    `${b}/api/v1/catalog/manage-listings/${encodeURIComponent(listingId)}${manageListingsOrgQuery(organizationId)}`,
    { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } },
  )
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `listing_delete_${res.status}`)
  }
  return json(res)
}

/** Toplu kalıcı silme (en fazla 100 id). */
export async function deleteManageCatalogListingsBulk(
  token: string,
  listingIds: string[],
  organizationId?: string,
): Promise<ManageListingDeleteBulkResult> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/catalog/manage-listings/delete-bulk${manageListingsOrgQuery(organizationId)}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ listing_ids: listingIds }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `listing_delete_bulk_${res.status}`)
  }
  const raw = await json<Record<string, unknown>>(res)
  const failed = Array.isArray(raw.failed)
    ? raw.failed
        .filter((x): x is Record<string, unknown> => x != null && typeof x === 'object')
        .map((x) => ({
          listing_id: typeof x.listing_id === 'string' ? x.listing_id : '',
          error: typeof x.error === 'string' ? x.error : 'listing_delete_failed',
        }))
    : []
  const deletedIds = Array.isArray(raw.deleted_ids)
    ? raw.deleted_ids.filter((x): x is string => typeof x === 'string')
    : []
  return {
    ok: raw.ok === true,
    deleted: typeof raw.deleted === 'number' ? raw.deleted : deletedIds.length,
    deleted_ids: deletedIds,
    failed,
  }
}

export async function createManageCatalogListing(
  token: string,
  body: {
    organization_id?: string
    category_code: string
    slug: string
    currency_code: string
    title: string
    /** Başlığın yazılacağı locale (ör. panel dili). Varsayılan: tr */
    title_locale?: string
    /** Kategori sözleşme havuzundan şablon uuid */
    category_contract_id?: string
  },
): Promise<{ id: string; slug: string; status: string }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/catalog/manage-listings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `manage_listing_create_${res.status}`)
  }
  return json(res)
}

export type ManageCategoryContractRow = {
  id: string
  code: string
  version: string
  sort_order: string
  is_active: string
  organization_id: string
  contract_scope: string
}

export async function listManageCategoryContracts(
  token: string,
  params: {
    contractScope: 'general' | 'sales' | 'category'
    categoryCode?: string
    organizationId?: string
  },
): Promise<{ contracts: ManageCategoryContractRow[] }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const u = new URLSearchParams()
  u.set('contract_scope', params.contractScope)
  if (params.contractScope === 'category' && params.categoryCode?.trim()) {
    u.set('category_code', params.categoryCode.trim())
  }
  if (params.organizationId?.trim()) u.set('organization_id', params.organizationId.trim())
  const res = await fetch(`${b}/api/v1/catalog/manage/category-contracts?${u.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `category_contracts_${res.status}`)
  }
  return json<{ contracts: ManageCategoryContractRow[] }>(res)
}

export async function createManageCategoryContract(
  token: string,
  body: {
    contract_scope?: 'general' | 'sales' | 'category'
    category_code?: string
    code: string
    organization_id?: string
    title: string
    body_text: string
    locale_code?: string
  },
): Promise<{ id: string; ok: boolean }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/catalog/manage/category-contracts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `category_contract_create_${res.status}`)
  }
  return json(res)
}

export async function patchManageListingContract(
  token: string,
  listingId: string,
  body: { category_contract_id: string },
  params?: { organizationId?: string },
): Promise<{ ok: boolean }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const u = new URLSearchParams()
  if (params?.organizationId?.trim()) u.set('organization_id', params.organizationId.trim())
  const qs = u.toString()
  const res = await fetch(
    `${b}/api/v1/catalog/manage-listings/${encodeURIComponent(listingId)}/contract${qs ? `?${qs}` : ''}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    },
  )
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `listing_contract_patch_${res.status}`)
  }
  return json(res)
}

export type PublicListingContract = {
  contract_id: string
  version: string
  title: string
  body_text: string
  locale: string
}

export async function getPublicListingContract(
  listingId: string,
  locale?: string,
): Promise<PublicListingContract> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const u = new URLSearchParams()
  if (locale?.trim()) u.set('locale', locale.trim().toLowerCase())
  const qs = u.toString()
  const res = await fetch(
    `${b}/api/v1/catalog/public/listings/${encodeURIComponent(listingId)}/contract${qs ? `?${qs}` : ''}`,
  )
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `public_listing_contract_${res.status}`)
  }
  return json<PublicListingContract>(res)
}

/** Yayında ilan sözleşmesi yoksa veya API hata verirse `null` (detay sayfasında link göstermemek için). */
export async function fetchPublicListingContractSafe(
  listingId: string,
  locale?: string,
): Promise<PublicListingContract | null> {
  const b = base()
  if (!b) return null
  const u = new URLSearchParams()
  if (locale?.trim()) u.set('locale', locale.trim().toLowerCase())
  const qs = u.toString()
  try {
    const res = await fetch(
      `${b}/api/v1/catalog/public/listings/${encodeURIComponent(listingId)}/contract${qs ? `?${qs}` : ''}`,
      { next: { revalidate: 300 } },
    )
    if (!res.ok) return null
    return await json<PublicListingContract>(res)
  } catch {
    return null
  }
}

export type PublicContractBlock = {
  contract_id: string
  version: string
  title: string
  body_text: string
}

export type PublicCheckoutContractsBundle = {
  listing_id: string
  locale: string
  organization_id: string
  category: PublicContractBlock | null
  general: PublicContractBlock | null
  sales: PublicContractBlock | null
}

/** Tek çağrıda genel + satış + kategori sözleşmeleri (checkout / vitrin). */
export async function getPublicCheckoutContractsBundle(
  listingId: string,
  locale?: string,
): Promise<PublicCheckoutContractsBundle> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const u = new URLSearchParams()
  u.set('listing_id', listingId.trim())
  if (locale?.trim()) u.set('locale', locale.trim().toLowerCase())
  const res = await fetch(`${b}/api/v1/catalog/public/checkout-contracts?${u.toString()}`)
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `public_checkout_contracts_${res.status}`)
  }
  return json<PublicCheckoutContractsBundle>(res)
}

export type ManageListingTranslationRow = {
  locale_code: string
  title: string
  description: string
}

/** GET — ilan çevirileri (aktif diller); yönetici için `organizationId` sorguda. */
export async function getManageListingTranslations(
  token: string,
  listingId: string,
  params?: { organizationId?: string },
): Promise<{ translations: ManageListingTranslationRow[] }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const u = new URLSearchParams()
  if (params?.organizationId?.trim()) u.set('organization_id', params.organizationId.trim())
  const qs = u.toString()
  const res = await fetch(
    `${b}/api/v1/catalog/listings/${encodeURIComponent(listingId)}/translations${qs ? `?${qs}` : ''}`,
    { headers: { Authorization: `Bearer ${token}` } },
  )
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `listing_translations_${res.status}`)
  }
  return json<{ translations: ManageListingTranslationRow[] }>(res)
}

/** PUT — toplu başlık/açıklama güncelleme. */
export async function putManageListingTranslations(
  token: string,
  listingId: string,
  body: { entries: { locale_code: string; title: string; description?: string }[] },
  params?: { organizationId?: string },
): Promise<{ ok: boolean }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const u = new URLSearchParams()
  if (params?.organizationId?.trim()) u.set('organization_id', params.organizationId.trim())
  const qs = u.toString()
  const res = await fetch(
    `${b}/api/v1/catalog/listings/${encodeURIComponent(listingId)}/translations${qs ? `?${qs}` : ''}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    },
  )
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `listing_translations_put_${res.status}`)
  }
  return json<{ ok: boolean }>(res)
}

function catalogListingQs(params?: { organizationId?: string }) {
  const u = new URLSearchParams()
  if (params?.organizationId?.trim()) u.set('organization_id', params.organizationId.trim())
  const qs = u.toString()
  return qs ? `?${qs}` : ''
}

export type ManageHotelRoomRow = {
  id: string
  name: string
  capacity: string | null
  board_type: string | null
  meta_json: string
  unit_count?: number
}

export type HotelRoomAvailabilityDay = {
  day: string
  available_units: number
  price_override: string | null
}

export async function listManageHotelRooms(
  token: string,
  listingId: string,
  params?: { organizationId?: string },
): Promise<{ rooms: ManageHotelRoomRow[] }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(
    `${b}/api/v1/catalog/listings/${encodeURIComponent(listingId)}/hotel-rooms${catalogListingQs(params)}`,
    { headers: { Authorization: `Bearer ${token}` } },
  )
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `hotel_rooms_${res.status}`)
  }
  return json(res)
}

export async function addManageHotelRoom(
  token: string,
  listingId: string,
  body: {
    name: string
    capacity?: string
    board_type?: string
    meta_json?: string
    unit_count?: number
  },
  params?: { organizationId?: string },
): Promise<{ id: string }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(
    `${b}/api/v1/catalog/listings/${encodeURIComponent(listingId)}/hotel-rooms${catalogListingQs(params)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    },
  )
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `hotel_room_add_${res.status}`)
  }
  return json(res)
}

export async function deleteManageHotelRoom(
  token: string,
  listingId: string,
  roomId: string,
  params?: { organizationId?: string },
): Promise<{ ok: boolean }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(
    `${b}/api/v1/catalog/listings/${encodeURIComponent(listingId)}/hotel-rooms/${encodeURIComponent(roomId)}${catalogListingQs(params)}`,
    { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } },
  )
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `hotel_room_delete_${res.status}`)
  }
  return json(res)
}

export type ManageHotelRoomInput = {
  id?: string
  name: string
  capacity?: string
  board_type?: string
  meta_json?: string
  unit_count?: number
}

export async function putManageHotelRooms(
  token: string,
  listingId: string,
  rooms: ManageHotelRoomInput[],
  params?: { organizationId?: string },
): Promise<{ ok: boolean }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(
    `${b}/api/v1/catalog/listings/${encodeURIComponent(listingId)}/hotel-rooms${catalogListingQs(params)}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ rooms }),
    },
  )
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `hotel_rooms_put_${res.status}`)
  }
  return json(res)
}

export async function getHotelRoomAvailabilityCalendar(
  token: string,
  listingId: string,
  roomId: string,
  range: { from: string; to: string },
  params?: { organizationId?: string },
): Promise<{ days: HotelRoomAvailabilityDay[] }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const u = new URLSearchParams()
  u.set('from', range.from)
  u.set('to', range.to)
  if (params?.organizationId?.trim()) u.set('organization_id', params.organizationId.trim())
  const res = await fetch(
    `${b}/api/v1/catalog/listings/${encodeURIComponent(listingId)}/hotel-rooms/${encodeURIComponent(roomId)}/availability-calendar?${u.toString()}`,
    { headers: { Authorization: `Bearer ${token}` } },
  )
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `hotel_room_availability_${res.status}`)
  }
  return json(res)
}

export async function putHotelRoomAvailabilityCalendar(
  token: string,
  listingId: string,
  roomId: string,
  body: { days: HotelRoomAvailabilityDay[] },
  params?: { organizationId?: string },
): Promise<{ ok: boolean }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(
    `${b}/api/v1/catalog/listings/${encodeURIComponent(listingId)}/hotel-rooms/${encodeURIComponent(roomId)}/availability-calendar${catalogListingQs(params)}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    },
  )
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `hotel_room_availability_put_${res.status}`)
  }
  return json(res)
}

// ─── Yemek Planları ───────────────────────────────────────────────────────────

export type MealPlanCode = 'room_only' | 'bed_breakfast' | 'half_board' | 'full_board' | 'all_inclusive' | 'custom'

/**
 * Yemek planı görünen etiketleri — 6 dilde (tr/en/de/ru/zh/fr).
 * Eski `tr`/`en` alanları geriye dönük uyumluluk için tutuluyor; yeni kodda
 * `MEAL_PLAN_LABELS_I18N[code][locale]` veya `pickI18n` ile okuyun.
 */
export const MEAL_PLAN_LABELS: Record<MealPlanCode, { tr: string; en: string; emoji: string }> = {
  room_only:      { tr: 'Yemeksiz',        en: 'Room Only',       emoji: '🛏️' },
  bed_breakfast:  { tr: 'Oda & Kahvaltı',  en: 'Bed & Breakfast', emoji: '☕' },
  half_board:     { tr: 'Yarım Pansiyon',  en: 'Half Board',      emoji: '🍽️' },
  full_board:     { tr: 'Tam Pansiyon',    en: 'Full Board',      emoji: '🍴' },
  all_inclusive:  { tr: 'Her Şey Dahil',   en: 'All Inclusive',   emoji: '✨' },
  custom:         { tr: 'Özel Plan',        en: 'Custom Plan',     emoji: '📋' },
}

/** Yemek planı kodu için 6-dilli görünen etiket haritası. */
export const MEAL_PLAN_LABELS_I18N: Record<MealPlanCode, Record<'tr' | 'en' | 'de' | 'ru' | 'zh' | 'fr', string>> = {
  room_only: {
    tr: 'Yemeksiz', en: 'Room Only', de: 'Nur Übernachtung', ru: 'Без питания', zh: '仅住宿', fr: 'Logement seul',
  },
  bed_breakfast: {
    tr: 'Oda & Kahvaltı', en: 'Bed & Breakfast', de: 'Übernachtung mit Frühstück', ru: 'Завтрак включён', zh: '含早餐', fr: 'Petit-déjeuner inclus',
  },
  half_board: {
    tr: 'Yarım Pansiyon', en: 'Half Board', de: 'Halbpension', ru: 'Полупансион', zh: '半膳', fr: 'Demi-pension',
  },
  full_board: {
    tr: 'Tam Pansiyon', en: 'Full Board', de: 'Vollpension', ru: 'Полный пансион', zh: '全膳', fr: 'Pension complète',
  },
  all_inclusive: {
    tr: 'Her Şey Dahil', en: 'All Inclusive', de: 'All-inclusive', ru: 'Всё включено', zh: '全包式', fr: 'Tout compris',
  },
  custom: {
    tr: 'Özel Plan', en: 'Custom Plan', de: 'Individueller Plan', ru: 'Индивидуальный план', zh: '定制方案', fr: 'Plan personnalisé',
  },
}

type MealOption = {
  value: string
  labelTr: string
  labelEn: string
  /** 6 dilli etiket — yeni kodlar için tercih edilir. */
  label_i18n?: Partial<Record<'tr' | 'en' | 'de' | 'ru' | 'zh' | 'fr', string>>
}

export const MEAL_OPTIONS: MealOption[] = [
  { value: 'breakfast', labelTr: 'Kahvaltı',     labelEn: 'Breakfast', label_i18n: { tr: 'Kahvaltı',     en: 'Breakfast', de: 'Frühstück',     ru: 'Завтрак',  zh: '早餐', fr: 'Petit-déjeuner' } },
  { value: 'lunch',     labelTr: 'Öğle Yemeği',  labelEn: 'Lunch',     label_i18n: { tr: 'Öğle Yemeği',  en: 'Lunch',     de: 'Mittagessen',   ru: 'Обед',     zh: '午餐', fr: 'Déjeuner' } },
  { value: 'dinner',    labelTr: 'Akşam Yemeği', labelEn: 'Dinner',    label_i18n: { tr: 'Akşam Yemeği', en: 'Dinner',    de: 'Abendessen',    ru: 'Ужин',     zh: '晚餐', fr: 'Dîner' } },
  { value: 'supper',    labelTr: 'Gece Yemeği',  labelEn: 'Supper',    label_i18n: { tr: 'Gece Yemeği',  en: 'Supper',    de: 'Spätmahlzeit',  ru: 'Поздний ужин', zh: '宵夜', fr: 'Souper' } },
]

export const MEAL_EXTRAS_OPTIONS: MealOption[] = [
  { value: 'tea',           labelTr: 'Çay / Kahve',       labelEn: 'Tea / Coffee',  label_i18n: { tr: 'Çay / Kahve',      en: 'Tea / Coffee',  de: 'Tee / Kaffee',     ru: 'Чай / кофе',         zh: '茶 / 咖啡',  fr: 'Thé / café' } },
  { value: 'soft_drinks',   labelTr: 'Alkolsüz İçecek',   labelEn: 'Soft Drinks',   label_i18n: { tr: 'Alkolsüz İçecek',  en: 'Soft Drinks',   de: 'Alkoholfreie Getränke', ru: 'Безалкогольные', zh: '软饮',       fr: 'Boissons sans alcool' } },
  { value: 'minibar',       labelTr: 'Mini Bar',           labelEn: 'Minibar',       label_i18n: { tr: 'Mini Bar',          en: 'Minibar',       de: 'Minibar',          ru: 'Мини-бар',           zh: '迷你吧',     fr: 'Minibar' } },
  { value: 'snacks',        labelTr: 'Atıştırmalık',       labelEn: 'Snacks',        label_i18n: { tr: 'Atıştırmalık',      en: 'Snacks',        de: 'Snacks',           ru: 'Закуски',            zh: '小吃',       fr: 'En-cas' } },
  { value: 'welcome_drink', labelTr: 'Karşılama İçeceği',  labelEn: 'Welcome Drink', label_i18n: { tr: 'Karşılama İçeceği', en: 'Welcome Drink', de: 'Willkommensgetränk', ru: 'Приветственный напиток', zh: '欢迎饮品', fr: 'Boisson de bienvenue' } },
  { value: 'fruit_basket',  labelTr: 'Meyve Tabağı',       labelEn: 'Fruit Basket',  label_i18n: { tr: 'Meyve Tabağı',     en: 'Fruit Basket',  de: 'Obstkorb',         ru: 'Корзина фруктов',    zh: '水果盘',     fr: 'Corbeille de fruits' } },
  { value: 'bbq',           labelTr: 'Barbekü',             labelEn: 'BBQ',           label_i18n: { tr: 'Barbekü',           en: 'BBQ',           de: 'Grillen',          ru: 'Барбекю',            zh: '烧烤',       fr: 'Barbecue' } },
]

export interface MealPlanRow {
  id: string
  plan_code: MealPlanCode
  label: string
  label_en: string
  included_meals: string   // JSON string → string[]
  included_extras: string  // JSON string → string[]
  price_per_night: string
  currency_code: string
  is_active: string
  sort_order: string
}

export interface MealPlanItem {
  id: string
  plan_code: MealPlanCode
  label: string
  label_en: string
  included_meals: string[]
  included_extras: string[]
  price_per_night: number
  currency_code: string
  is_active: boolean
  sort_order: number
}

function parseMealPlanRow(r: MealPlanRow): MealPlanItem {
  return {
    id: r.id,
    plan_code: r.plan_code,
    label: r.label,
    label_en: r.label_en,
    included_meals: (() => { try { return JSON.parse(r.included_meals) as string[] } catch { return [] } })(),
    included_extras: (() => { try { return JSON.parse(r.included_extras) as string[] } catch { return [] } })(),
    price_per_night: parseFloat(r.price_per_night) || 0,
    currency_code: r.currency_code,
    is_active: r.is_active === 'true',
    sort_order: parseInt(r.sort_order, 10) || 0,
  }
}

export async function listManageMealPlans(
  token: string,
  listingId: string,
  params?: { organizationId?: string },
): Promise<{ meal_plans: MealPlanItem[] }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(
    `${b}/api/v1/catalog/listings/${encodeURIComponent(listingId)}/meal-plans${catalogListingQs(params)}`,
    { headers: { Authorization: `Bearer ${token}` } },
  )
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `meal_plans_${res.status}`)
  }
  const data = await json<{ meal_plans: MealPlanRow[] }>(res)
  return { meal_plans: data.meal_plans.map(parseMealPlanRow) }
}

export async function createManageMealPlan(
  token: string,
  listingId: string,
  body: {
    plan_code: MealPlanCode
    label: string
    label_en?: string
    included_meals?: string[]
    included_extras?: string[]
    price_per_night: string
    currency_code: string
  },
  params?: { organizationId?: string },
): Promise<{ id: string }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(
    `${b}/api/v1/catalog/listings/${encodeURIComponent(listingId)}/meal-plans${catalogListingQs(params)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        ...body,
        included_meals: JSON.stringify(body.included_meals ?? []),
        included_extras: JSON.stringify(body.included_extras ?? []),
      }),
    },
  )
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `meal_plan_create_${res.status}`)
  }
  return json(res)
}

export async function updateManageMealPlan(
  token: string,
  listingId: string,
  planId: string,
  body: {
    label: string
    label_en?: string
    included_meals?: string[]
    included_extras?: string[]
    price_per_night: string
    currency_code: string
    is_active?: boolean
    sort_order?: number
    notes?: string
  },
  params?: { organizationId?: string },
): Promise<{ ok: boolean }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(
    `${b}/api/v1/catalog/listings/${encodeURIComponent(listingId)}/meal-plans/${encodeURIComponent(planId)}${catalogListingQs(params)}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        ...body,
        included_meals: JSON.stringify(body.included_meals ?? []),
        included_extras: JSON.stringify(body.included_extras ?? []),
        is_active: String(body.is_active ?? true),
        sort_order: String(body.sort_order ?? 0),
      }),
    },
  )
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `meal_plan_update_${res.status}`)
  }
  return json(res)
}

export async function deleteManageMealPlan(
  token: string,
  listingId: string,
  planId: string,
  params?: { organizationId?: string },
): Promise<{ ok: boolean }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(
    `${b}/api/v1/catalog/listings/${encodeURIComponent(listingId)}/meal-plans/${encodeURIComponent(planId)}${catalogListingQs(params)}`,
    { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } },
  )
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `meal_plan_delete_${res.status}`)
  }
  return json(res)
}

/** Önyüz — herkese açık, aktif yemek planları */
export async function getPublicMealPlans(listingId: string): Promise<MealPlanItem[]> {
  const b = base()
  if (!b) return []
  try {
    const res = await fetch(
      `${b}/api/v1/catalog/public/listings/${encodeURIComponent(listingId)}/meal-plans`,
      { next: { revalidate: 60 } },
    )
    if (!res.ok) return []
    const data = await json<{ meal_plans: MealPlanRow[] }>(res)
    return data.meal_plans.map(parseMealPlanRow)
  } catch {
    return []
  }
}

export type HotelListingPromotion = {
  id: string
  title: string
  title_en: string
  image_url: string
  link_url: string
  sort_order: number
  is_active: boolean
}

type HotelListingPromotionRow = {
  id: string
  title: string
  title_en: string
  image_url: string
  link_url: string
  sort_order: string
  is_active: string
}

function parseHotelPromotionRow(r: HotelListingPromotionRow): HotelListingPromotion {
  return {
    id: r.id,
    title: r.title,
    title_en: r.title_en,
    image_url: r.image_url,
    link_url: r.link_url,
    sort_order: parseInt(r.sort_order, 10) || 0,
    is_active: r.is_active === 'true',
  }
}

export async function listManageHotelPromotions(
  token: string,
  listingId: string,
  params?: { organizationId?: string },
): Promise<{ promotions: HotelListingPromotion[] }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(
    `${b}/api/v1/catalog/listings/${encodeURIComponent(listingId)}/hotel-promotions${catalogListingQs(params)}`,
    { headers: { Authorization: `Bearer ${token}` } },
  )
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `hotel_promotions_${res.status}`)
  }
  const data = await json<{ promotions: HotelListingPromotionRow[] }>(res)
  return { promotions: (data.promotions ?? []).map(parseHotelPromotionRow) }
}

export async function createManageHotelPromotion(
  token: string,
  listingId: string,
  body: { title: string; title_en?: string; image_url?: string; link_url?: string },
  params?: { organizationId?: string },
): Promise<{ id: string }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(
    `${b}/api/v1/catalog/listings/${encodeURIComponent(listingId)}/hotel-promotions${catalogListingQs(params)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    },
  )
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `hotel_promotion_create_${res.status}`)
  }
  return json(res)
}

export async function updateManageHotelPromotion(
  token: string,
  listingId: string,
  promotionId: string,
  body: {
    title: string
    title_en?: string
    image_url?: string
    link_url?: string
    is_active?: boolean
    sort_order?: number
  },
  params?: { organizationId?: string },
): Promise<{ ok: boolean }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(
    `${b}/api/v1/catalog/listings/${encodeURIComponent(listingId)}/hotel-promotions/${encodeURIComponent(promotionId)}${catalogListingQs(params)}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        ...body,
        is_active: String(body.is_active ?? true),
        sort_order: String(body.sort_order ?? 0),
      }),
    },
  )
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `hotel_promotion_update_${res.status}`)
  }
  return json(res)
}

export async function deleteManageHotelPromotion(
  token: string,
  listingId: string,
  promotionId: string,
  params?: { organizationId?: string },
): Promise<{ ok: boolean }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(
    `${b}/api/v1/catalog/listings/${encodeURIComponent(listingId)}/hotel-promotions/${encodeURIComponent(promotionId)}${catalogListingQs(params)}`,
    { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } },
  )
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `hotel_promotion_delete_${res.status}`)
  }
  return json(res)
}

/** Önyüz — galeri altı otel kampanya kartları */
export async function getPublicHotelPromotions(listingId: string): Promise<HotelListingPromotion[]> {
  const b = base()
  if (!b) return []
  try {
    const res = await fetch(
      `${b}/api/v1/catalog/public/listings/${encodeURIComponent(listingId)}/hotel-promotions`,
      { next: { revalidate: 60 } },
    )
    if (!res.ok) return []
    const data = await json<{ promotions: HotelListingPromotionRow[] }>(res)
    return (data.promotions ?? []).map(parseHotelPromotionRow)
  } catch {
    return []
  }
}

export type HotelListingActivity = {
  id: string
  title: string
  title_en: string
  description: string
  description_en: string
  image_url: string
  activity_date: string
  /** Etkinlik günü konaklamaya eklenen tutar; 0 = ücretsiz / bilgilendirme banner'ı */
  stay_surcharge_amount: number
  currency_code: string
  sort_order: number
  is_active: boolean
}

type HotelListingActivityRow = {
  id: string
  title: string
  title_en: string
  description: string
  description_en: string
  image_url: string
  activity_date: string
  stay_surcharge_amount: string
  currency_code: string
  sort_order: string
  is_active: string
}

function parseHotelActivityRow(r: HotelListingActivityRow): HotelListingActivity {
  return {
    id: r.id,
    title: r.title,
    title_en: r.title_en,
    description: r.description,
    description_en: r.description_en,
    image_url: r.image_url,
    activity_date: r.activity_date,
    stay_surcharge_amount: Number.parseFloat(r.stay_surcharge_amount) || 0,
    currency_code: r.currency_code || 'TRY',
    sort_order: parseInt(r.sort_order, 10) || 0,
    is_active: r.is_active === 'true',
  }
}

export async function listManageHotelActivities(
  token: string,
  listingId: string,
  params?: { organizationId?: string },
): Promise<{ activities: HotelListingActivity[] }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(
    `${b}/api/v1/catalog/listings/${encodeURIComponent(listingId)}/hotel-activities${catalogListingQs(params)}`,
    { headers: { Authorization: `Bearer ${token}` } },
  )
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `hotel_activities_${res.status}`)
  }
  const data = await json<{ activities: HotelListingActivityRow[] }>(res)
  return { activities: (data.activities ?? []).map(parseHotelActivityRow) }
}

export async function createManageHotelActivity(
  token: string,
  listingId: string,
  body: {
    title: string
    title_en?: string
    description?: string
    description_en?: string
    image_url?: string
    activity_date: string
    stay_surcharge_amount?: number
    currency_code?: string
  },
  params?: { organizationId?: string },
): Promise<{ id: string }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(
    `${b}/api/v1/catalog/listings/${encodeURIComponent(listingId)}/hotel-activities${catalogListingQs(params)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    },
  )
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `hotel_activity_create_${res.status}`)
  }
  return json(res)
}

export async function updateManageHotelActivity(
  token: string,
  listingId: string,
  activityId: string,
  body: {
    title: string
    title_en?: string
    description?: string
    description_en?: string
    image_url?: string
    activity_date: string
    stay_surcharge_amount?: number
    currency_code?: string
    is_active?: boolean
    sort_order?: number
  },
  params?: { organizationId?: string },
): Promise<void> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(
    `${b}/api/v1/catalog/listings/${encodeURIComponent(listingId)}/hotel-activities/${encodeURIComponent(activityId)}${catalogListingQs(params)}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    },
  )
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `hotel_activity_update_${res.status}`)
  }
}

export async function deleteManageHotelActivity(
  token: string,
  listingId: string,
  activityId: string,
  params?: { organizationId?: string },
): Promise<void> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(
    `${b}/api/v1/catalog/listings/${encodeURIComponent(listingId)}/hotel-activities/${encodeURIComponent(activityId)}${catalogListingQs(params)}`,
    { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } },
  )
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `hotel_activity_delete_${res.status}`)
  }
}

/** Önyüz — otel etkinlik kartları */
export async function getPublicHotelActivities(listingId: string): Promise<HotelListingActivity[]> {
  const b = base()
  if (!b) return []
  try {
    const res = await fetch(
      `${b}/api/v1/catalog/public/listings/${encodeURIComponent(listingId)}/hotel-activities`,
      { next: { revalidate: 60 } },
    )
    if (!res.ok) return []
    const data = await json<{ activities: HotelListingActivityRow[] }>(res)
    return (data.activities ?? []).map(parseHotelActivityRow)
  } catch {
    return []
  }
}

/** Yayında ilan — katalogdan başlık, açıklama, iletişim adı (vitrin detay sayfası) */
export type PublicListingVitrine = {
  title: string
  description: string
  contact_name: string | null
  /** Vitrin ilan sahibi kartı — admin panelinden girilir */
  contact_bio?: string | null
  /** `location_name` veya panel `listing_meta.address` birleşimi — başlık altı konum satırı */
  location_label?: string | null
  /** listing_meta.district_label — bölge / semt */
  location_area?: string | null
  /** listing_meta.city — ilçe */
  location_district?: string | null
  /** listing_meta.province_city — il */
  location_province?: string | null
  external_listing_ref?: string | null
}

export type PublicListingPriceLines = {
  included: { label: string }[]
  excluded: { label: string }[]
}

export type PublicTourPeriodsResponse = {
  currency_code: string
  periods: unknown[]
  period_prices: unknown[]
}

export type FerryPassengerPrice = {
  adult: number
  baby: number
  child: number
}

export type FerryTicketFare = {
  type: string
  label_tr?: string
  official: FerryPassengerPrice
  agency: FerryPassengerPrice
}

export type FerryPortTax = {
  port: string
  ow: number
  sdr: number
  or: number
}

export type FerryAgePolicy = {
  baby_max?: number
  child_min?: number
  child_max?: number
  adult_min?: number
}

export type FerrySailings = {
  departures?: string[]
  vessel?: string
  duration_minutes?: number
}

export type PublicFerryDetails = {
  route_code: string
  from_port_label: string
  to_port_label: string
  operator_name: string
  port_taxes_included: boolean
  ticket_fares: FerryTicketFare[]
  port_taxes: FerryPortTax[]
  age_policy: FerryAgePolicy
  timetable_url?: string
  currency_code: string
  sailings?: FerrySailings
}

export async function getPublicFerryDetails(
  listingId: string,
): Promise<PublicFerryDetails | null> {
  const b = base()
  if (!b) return null
  try {
    const res = await fetch(
      `${b}/api/v1/catalog/public/listings/${encodeURIComponent(listingId)}/ferry-details`,
      typeof window === 'undefined' ? { next: { revalidate: 120 } } : {},
    )
    if (!res.ok) return null
    return json<PublicFerryDetails>(res)
  } catch {
    return null
  }
}

export async function getPublicTourPeriods(
  listingId: string,
): Promise<PublicTourPeriodsResponse | null> {
  const b = base()
  if (!b) return null
  try {
    const res = await fetch(
      `${b}/api/v1/catalog/public/listings/${encodeURIComponent(listingId)}/tour-periods`,
      typeof window === 'undefined' ? { next: { revalidate: 120 } } : {},
    )
    if (!res.ok) return null
    return json<PublicTourPeriodsResponse>(res)
  } catch {
    return null
  }
}

export async function getPublicListingPriceLines(
  listingId: string,
  locale?: string,
): Promise<PublicListingPriceLines | null> {
  const b = base()
  if (!b) return null
  const u = new URLSearchParams()
  if (locale?.trim()) u.set('locale', locale.trim())
  try {
    const res = await fetch(
      `${b}/api/v1/catalog/public/listings/${encodeURIComponent(listingId)}/price-lines${u.toString() ? `?${u}` : ''}`,
      typeof window === 'undefined' ? { next: { revalidate: 120 } } : {},
    )
    if (!res.ok) return null
    return json<PublicListingPriceLines>(res)
  } catch {
    return null
  }
}

export async function getPublicListingVitrine(
  listingId: string,
  locale?: string,
  fetchOpts?: { cache?: RequestCache },
): Promise<PublicListingVitrine | null> {
  const b = base()
  if (!b) return null
  const u = new URLSearchParams()
  if (locale?.trim()) u.set('locale', locale.trim())
  try {
    const cacheOpt = fetchOpts?.cache
    const init: RequestInit =
      cacheOpt != null
        ? { cache: cacheOpt }
        : typeof window === 'undefined'
          ? { next: { revalidate: 60 } }
          : {}
    const res = await fetch(
      `${b}/api/v1/catalog/public/listings/${encodeURIComponent(listingId)}/vitrine${u.toString() ? `?${u}` : ''}`,
      init,
    )
    if (!res.ok) return null
    return json<PublicListingVitrine>(res)
  } catch {
    return null
  }
}

export type ManageHotelDetails = {
  star_rating: string | null
  etstur_property_ref: string | null
  tatilcom_property_ref: string | null
}

export async function getManageHotelDetails(
  token: string,
  listingId: string,
  params?: { organizationId?: string },
): Promise<ManageHotelDetails> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(
    `${b}/api/v1/catalog/listings/${encodeURIComponent(listingId)}/hotel-details${catalogListingQs(params)}`,
    { headers: { Authorization: `Bearer ${token}` } },
  )
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `hotel_details_${res.status}`)
  }
  return json(res)
}

export async function patchManageHotelDetails(
  token: string,
  listingId: string,
  body: { star_rating?: string; etstur_property_ref?: string; tatilcom_property_ref?: string },
  params?: { organizationId?: string },
): Promise<{ ok: boolean }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(
    `${b}/api/v1/catalog/listings/${encodeURIComponent(listingId)}/hotel-details${catalogListingQs(params)}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    },
  )
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `hotel_details_patch_${res.status}`)
  }
  return json(res)
}

export type ActivitySessionRow = {
  id?: string
  valid_from: string
  valid_to: string
  start_time: string
  duration_minutes?: string | null
  capacity?: string | null
  is_active?: boolean
  sort_order?: string | null
  adult_price?: string | null
  child_price?: string | null
  currency_code?: string | null
  adult_min_age?: string | null
  adult_max_age?: string | null
  child_min_age?: string | null
}

export async function listManageActivitySessions(
  token: string,
  listingId: string,
  params?: { organizationId?: string },
): Promise<{ sessions: ActivitySessionRow[] }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(
    `${b}/api/v1/catalog/listings/${encodeURIComponent(listingId)}/activity-sessions${catalogListingQs(params)}`,
    { headers: { Authorization: `Bearer ${token}` } },
  )
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `activity_sessions_${res.status}`)
  }
  return json(res)
}

export async function putManageActivitySessions(
  token: string,
  listingId: string,
  sessions: ActivitySessionRow[],
  params?: { organizationId?: string },
): Promise<{ ok: boolean }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(
    `${b}/api/v1/catalog/listings/${encodeURIComponent(listingId)}/activity-sessions${catalogListingQs(params)}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ sessions }),
    },
  )
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `activity_sessions_put_${res.status}`)
  }
  return json(res)
}

export async function listPublicActivitySessions(
  listingId: string,
  date?: string,
): Promise<{ sessions: ActivitySessionRow[] }> {
  const b = base()
  if (!b) return { sessions: [] }
  const u = new URLSearchParams()
  if (date?.trim()) u.set('date', date.trim())
  try {
    const res = await fetch(
      `${b}/api/v1/catalog/public/listings/${encodeURIComponent(listingId)}/activity-sessions${u.toString() ? `?${u}` : ''}`,
      typeof window === 'undefined' ? { next: { revalidate: 60 } } : {},
    )
    if (!res.ok) return { sessions: [] }
    return json(res)
  } catch {
    return { sessions: [] }
  }
}

export type ActivityQuote = {
  currency_code: string
  adult_unit: string
  child_unit: string
  line_total: string
  capacity: string
  remaining_hint?: string
  start_time?: string
}

export async function quotePublicActivity(
  listingId: string,
  body: { date: string; session_id: string; adults: number; children: number },
): Promise<ActivityQuote> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/catalog/public/listings/${encodeURIComponent(listingId)}/activity-quote`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `activity_quote_${res.status}`)
  }
  return json(res)
}

/** Takvim günü özel durumu — `listing_availability_calendar.day_status` */
export type ListingAvailabilityDayStatus = 'option' | 'promo'

export type ListingAvailabilityDay = {
  day: string
  is_available: boolean
  price_override: string | null
  /** Öğleden önce müsait (yoksa `is_available` kullanılır) */
  am_available?: boolean
  /** Öğleden sonra müsait (yoksa `is_available` kullanılır) */
  pm_available?: boolean
  /** Opsiyon (hold) veya fırsat (promo) — vitrin renkleri */
  day_status?: ListingAvailabilityDayStatus | null
}

export async function getListingAvailabilityCalendar(
  token: string,
  listingId: string,
  range: { from: string; to: string },
  params?: { organizationId?: string },
): Promise<{ days: ListingAvailabilityDay[] }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const u = new URLSearchParams()
  u.set('from', range.from)
  u.set('to', range.to)
  if (params?.organizationId?.trim()) u.set('organization_id', params.organizationId.trim())
  const res = await fetch(
    `${b}/api/v1/catalog/listings/${encodeURIComponent(listingId)}/availability-calendar?${u.toString()}`,
    { headers: { Authorization: `Bearer ${token}` } },
  )
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `availability_${res.status}`)
  }
  return json(res)
}

export async function putListingAvailabilityCalendar(
  token: string,
  listingId: string,
  body: {
    days: {
      day: string
      is_available: boolean
      price_override?: string
      am_available?: boolean
      pm_available?: boolean
      day_status?: ListingAvailabilityDayStatus | '' | null
    }[]
  },
  params?: { organizationId?: string },
): Promise<{ ok: boolean }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(
    `${b}/api/v1/catalog/listings/${encodeURIComponent(listingId)}/availability-calendar${catalogListingQs(params)}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    },
  )
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `availability_put_${res.status}`)
  }
  return json(res)
}

export type ListingPriceRuleRow = {
  id: string
  rule_json: string
  valid_from: string | null
  valid_to: string | null
}

export async function listListingPriceRules(
  token: string,
  listingId: string,
  params?: { organizationId?: string },
): Promise<{ rules: ListingPriceRuleRow[] }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(
    `${b}/api/v1/catalog/listings/${encodeURIComponent(listingId)}/price-rules${catalogListingQs(params)}`,
    { headers: { Authorization: `Bearer ${token}` } },
  )
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `price_rules_${res.status}`)
  }
  return json(res)
}

export async function createListingPriceRule(
  token: string,
  listingId: string,
  body: { rule_json: string; valid_from?: string; valid_to?: string },
  params?: { organizationId?: string },
): Promise<{ id: string }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(
    `${b}/api/v1/catalog/listings/${encodeURIComponent(listingId)}/price-rules${catalogListingQs(params)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    },
  )
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `price_rule_create_${res.status}`)
  }
  return json(res)
}

export async function deleteListingPriceRule(
  token: string,
  listingId: string,
  ruleId: string,
  params?: { organizationId?: string },
): Promise<{ ok: boolean }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(
    `${b}/api/v1/catalog/listings/${encodeURIComponent(listingId)}/price-rules/${encodeURIComponent(ruleId)}${catalogListingQs(params)}`,
    { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } },
  )
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `price_rule_delete_${res.status}`)
  }
  return json(res)
}

export type ListingExternalBookingRow = {
  id: string
  stay_from: string
  stay_to: string
  source_label: string
  sold_total: number | null
  amount_received: number | null
  amount_remaining: number | null
  first_payment_note: string
  notes: string
  created_at: string
}

function parseExternalBookingRow(raw: Record<string, unknown>): ListingExternalBookingRow | null {
  const id = typeof raw.id === 'string' ? raw.id : ''
  if (!id) return null
  const numOrNull = (v: unknown): number | null =>
    typeof v === 'number' && Number.isFinite(v) ? v : null
  return {
    id,
    stay_from: typeof raw.stay_from === 'string' ? raw.stay_from : '',
    stay_to: typeof raw.stay_to === 'string' ? raw.stay_to : '',
    source_label: typeof raw.source_label === 'string' ? raw.source_label : '',
    sold_total: numOrNull(raw.sold_total),
    amount_received: numOrNull(raw.amount_received),
    amount_remaining: numOrNull(raw.amount_remaining),
    first_payment_note: typeof raw.first_payment_note === 'string' ? raw.first_payment_note : '',
    notes: typeof raw.notes === 'string' ? raw.notes : '',
    created_at: typeof raw.created_at === 'string' ? raw.created_at : '',
  }
}

export async function listListingExternalBookings(
  token: string,
  listingId: string,
  params?: { organizationId?: string },
): Promise<{ bookings: ListingExternalBookingRow[] }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(
    `${b}/api/v1/catalog/listings/${encodeURIComponent(listingId)}/external-bookings${catalogListingQs(params)}`,
    { headers: { Authorization: `Bearer ${token}` } },
  )
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `external_bookings_${res.status}`)
  }
  const data = (await json<{ bookings?: unknown[] }>(res)) ?? {}
  const bookings: ListingExternalBookingRow[] = []
  if (Array.isArray(data.bookings)) {
    for (const x of data.bookings) {
      if (!x || typeof x !== 'object') continue
      const row = parseExternalBookingRow(x as Record<string, unknown>)
      if (row) bookings.push(row)
    }
  }
  return { bookings }
}

export async function createListingExternalBooking(
  token: string,
  listingId: string,
  body: {
    stay_from: string
    stay_to: string
    source_label?: string
    sold_total?: string
    amount_received?: string
    amount_remaining?: string
    first_payment_note?: string
    notes?: string
  },
  params?: { organizationId?: string },
): Promise<{ id: string }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(
    `${b}/api/v1/catalog/listings/${encodeURIComponent(listingId)}/external-bookings${catalogListingQs(params)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    },
  )
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `external_booking_create_${res.status}`)
  }
  return json(res)
}

export async function patchListingExternalBooking(
  token: string,
  listingId: string,
  bookingId: string,
  body: {
    stay_from: string
    stay_to: string
    source_label?: string
    sold_total?: string
    amount_received?: string
    amount_remaining?: string
    first_payment_note?: string
    notes?: string
  },
  params?: { organizationId?: string },
): Promise<{ ok: boolean }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(
    `${b}/api/v1/catalog/listings/${encodeURIComponent(listingId)}/external-bookings/${encodeURIComponent(bookingId)}${catalogListingQs(params)}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    },
  )
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `external_booking_patch_${res.status}`)
  }
  return json(res)
}

export async function deleteListingExternalBooking(
  token: string,
  listingId: string,
  bookingId: string,
  params?: { organizationId?: string },
): Promise<{ ok: boolean }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(
    `${b}/api/v1/catalog/listings/${encodeURIComponent(listingId)}/external-bookings/${encodeURIComponent(bookingId)}${catalogListingQs(params)}`,
    { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } },
  )
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `external_booking_delete_${res.status}`)
  }
  return json(res)
}

/** Vitrin — yayında ilanın dönemsel fiyat kuralları (kimlik doğrulama gerekmez) */
export async function getPublicListingPriceRules(listingId: string): Promise<ListingPriceRuleRow[]> {
  const b = base()
  if (!b) return []
  try {
    const res = await fetch(
      `${b}/api/v1/catalog/public/listings/${encodeURIComponent(listingId)}/price-rules`,
      { next: { revalidate: 120 } },
    )
    if (!res.ok) return []
    const data = await json<{ rules: ListingPriceRuleRow[] }>(res)
    return data.rules ?? []
  } catch {
    return []
  }
}

/** Kategori konaklama kuralı şablonu (giriş/çıkış saati burada tanımlanmaz; vitrinde ayrı satır) */
export type CategoryAccommodationRuleItem = {
  id: string
  severity: 'ok' | 'warn'
  labels: Record<string, string>
}

function parseCategoryAccommodationRulesJson(raw: string): CategoryAccommodationRuleItem[] {
  try {
    const v = JSON.parse(raw) as unknown
    if (!Array.isArray(v)) return []
    const out: CategoryAccommodationRuleItem[] = []
    for (const x of v) {
      if (!x || typeof x !== 'object') continue
      const o = x as Record<string, unknown>
      const id = typeof o.id === 'string' ? o.id.trim() : ''
      if (!id) continue
      const severity = o.severity === 'warn' ? 'warn' : 'ok'
      let labels: Record<string, string> = {}
      if (o.labels && typeof o.labels === 'object' && !Array.isArray(o.labels)) {
        labels = Object.fromEntries(
          Object.entries(o.labels as Record<string, unknown>).filter(
            (e): e is [string, string] => typeof e[1] === 'string',
          ),
        )
      }
      out.push({ id, severity, labels })
    }
    return out
  } catch {
    return []
  }
}

function parseListingAccommodationRuleIdsJson(raw: string): string[] {
  try {
    const v = JSON.parse(raw) as unknown
    if (Array.isArray(v)) return v.filter((x): x is string => typeof x === 'string')
    if (typeof v === 'string') {
      const inner = JSON.parse(v) as unknown
      return Array.isArray(inner) ? inner.filter((x): x is string => typeof x === 'string') : []
    }
  } catch {
    /* ignore */
  }
  return []
}

/** Yönetim — kategori konaklama kuralları şablonu (gövde PUT: JSON dizi) */
export async function getManageCategoryAccommodationRules(
  token: string,
  categoryCode: string,
  params?: { organizationId?: string },
): Promise<CategoryAccommodationRuleItem[]> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const sp = new URLSearchParams({ category_code: categoryCode })
  if (params?.organizationId?.trim()) sp.set('organization_id', params.organizationId.trim())
  const res = await fetch(`${b}/api/v1/catalog/accommodation-rules?${sp.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(`accommodation_rules_get_${res.status}`)
  const data = await json<{ rules_json: string }>(res)
  return parseCategoryAccommodationRulesJson(data.rules_json ?? '[]')
}

export async function putManageCategoryAccommodationRules(
  token: string,
  categoryCode: string,
  rules: CategoryAccommodationRuleItem[],
  params?: { organizationId?: string },
): Promise<{ ok: boolean }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const sp = new URLSearchParams({ category_code: categoryCode })
  if (params?.organizationId?.trim()) sp.set('organization_id', params.organizationId.trim())
  const res = await fetch(`${b}/api/v1/catalog/accommodation-rules?${sp.toString()}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(rules),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `accommodation_rules_put_${res.status}`)
  }
  return json(res)
}

/** Vitrin — kategori kuralları + ilanın seçtiği id’ler (yayınlanmış ilan) */
export async function getPublicListingAccommodationRules(
  listingId: string,
): Promise<{
  rules: CategoryAccommodationRuleItem[]
  selectedIds: string[]
  checkInTime?: string
  checkOutTime?: string
  ruleCodes?: string[]
} | null> {
  const b = base()
  if (!b) return null
  try {
    const res = await fetch(
      `${b}/api/v1/catalog/public/listings/${encodeURIComponent(listingId)}/accommodation-rules`,
      { next: { revalidate: 120 } },
    )
    if (!res.ok) return null
    const data = await json<{
      rules_json: string
      selected_ids_json: string
      check_in_time?: string
      check_out_time?: string
      rule_codes_json?: string
    }>(res)
    let ruleCodes: string[] = []
    try {
      const parsed = JSON.parse(data.rule_codes_json ?? '[]') as unknown
      if (Array.isArray(parsed)) {
        ruleCodes = parsed.filter((x): x is string => typeof x === 'string' && x.trim() !== '')
      }
    } catch {
      ruleCodes = []
    }
    return {
      rules: parseCategoryAccommodationRulesJson(data.rules_json ?? '[]'),
      selectedIds: parseListingAccommodationRuleIdsJson(data.selected_ids_json ?? '[]'),
      checkInTime: data.check_in_time?.trim() || undefined,
      checkOutTime: data.check_out_time?.trim() || undefined,
      ruleCodes: ruleCodes.length > 0 ? ruleCodes : undefined,
    }
  } catch {
    return null
  }
}

/** Vitrin — yayında ilanın günlük müsaitlik satırları (`from` / `to` YYYY-MM-DD, kimlik doğrulama yok) */
export async function getPublicListingAvailabilityCalendar(
  listingId: string,
  range: { from: string; to: string },
): Promise<ListingAvailabilityDay[]> {
  const b = base()
  if (!b) return []
  try {
    const u = new URLSearchParams()
    u.set('from', range.from)
    u.set('to', range.to)
    const res = await fetch(
      `${b}/api/v1/catalog/public/listings/${encodeURIComponent(listingId)}/availability-calendar?${u.toString()}`,
      { cache: 'no-store' },
    )
    if (!res.ok) return []
    const data = await json<{ days: ListingAvailabilityDay[] }>(res)
    return data.days ?? []
  } catch {
    return []
  }
}

/** Yaklaşık 24 ay; API yok veya hata → boş dizi (tüm günler seçilebilir varsayılır) */
export async function fetchPublicListingAvailabilityDaysSafe(
  listingId: string | null | undefined,
): Promise<ListingAvailabilityDay[]> {
  if (!listingId?.trim()) return []
  const from = new Date()
  from.setHours(0, 0, 0, 0)
  const to = new Date(from)
  to.setMonth(to.getMonth() + 24)
  return getPublicListingAvailabilityCalendar(listingId.trim(), {
    from: formatLocalYmd(from),
    to: formatLocalYmd(to),
  })
}

export type ListingBedroomRow = {
  id: string
  name: string
  floor_label: string | null
  beds_description: string
  sort_order: string
  ensuite: boolean
}

export async function getPublicListingBedrooms(
  listingId: string,
): Promise<ListingBedroomRow[]> {
  const b = base()
  if (!b) return []
  try {
    const res = await fetch(
      `${b}/api/v1/catalog/public/listings/${encodeURIComponent(listingId)}/bedrooms`,
      { next: { revalidate: 120 } },
    )
    if (!res.ok) return []
    const data = await json<{ bedrooms: ListingBedroomRow[] }>(res)
    return data.bedrooms ?? []
  } catch {
    return []
  }
}

export async function fetchPublicListingBedroomsSafe(
  listingId: string | null | undefined,
): Promise<ListingBedroomRow[]> {
  if (!listingId?.trim()) return []
  return getPublicListingBedrooms(listingId.trim())
}

export async function fetchPublicVerticalYachtSafe(
  listingId: string | null | undefined,
): Promise<Record<string, string>> {
  if (!listingId?.trim()) return {}
  try {
    return await getVerticalYacht(listingId.trim())
  } catch {
    return {}
  }
}

export async function fetchPublicVerticalMetaSafe<T = Record<string, unknown>>(
  listingId: string | null | undefined,
  category: string,
): Promise<T> {
  if (!listingId?.trim() || !category.trim()) return {} as T
  try {
    return await getVerticalMeta<T>(listingId.trim(), category.trim())
  } catch {
    return {} as T
  }
}

/** POST — yeni para birimi (yönetici oturumu; TCMB sonrası kur için önce ekleyin). */
export async function createCurrency(
  token: string,
  body: {
    code: string
    name: string
    symbol?: string
    decimal_places?: number
    is_active?: boolean
  },
): Promise<CurrencyRow> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/currency/currencies`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `currency_create_${res.status}`)
  }
  return json(res)
}

/** Para birimini aktif/pasif (yönetici oturumu). */
export async function patchCurrencyActive(
  token: string,
  code: string,
  is_active: boolean,
): Promise<CurrencyRow> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/currency/currencies/${encodeURIComponent(code)}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ is_active }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `currency_patch_${res.status}`)
  }
  return json(res)
}

/** NetGSM test SMS — `admin.integrations.write` gerekir. */
export async function sendNetgsmTestSms(
  token: string,
  body: { gsm: string; message: string },
): Promise<{ ok: boolean; provider_raw: string }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/integrations/netgsm/sms`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `netgsm_sms_${res.status}`)
  }
  return json(res)
}

export type AuthUser = {
  id: string
  email: string
  display_name: string | null
  /** ISO timestamp veya null — kimlik yönetici onayıyla doğrulanmış */
  identity_verified_at?: string | null
  tc_verification_pending?: boolean
  tc_verification_pending_since?: string | null
  tc_verification_rejection_note?: string | null
}

/** G3.0 — kullanıcıya atanmış roller (organization_id boşsa null) */
export type RoleAssignment = { role_code: string; organization_id: string | null }

export type RoleCatalogEntry = { code: string; description: string }

/**
 * Kayıt: tarayıcıdan **Next API proxy** üzerine gider; dönen yanıtta
 * sunucu HttpOnly cookie set eder ve tokenı gövdede de döner. Doğrudan
 * backend'e değil, `/api/auth/register`'a istek atarız.
 */
export async function registerUser(body: {
  email: string
  password: string
  display_name?: string
}): Promise<{ token: string; user: AuthUser }> {
  const res = await fetch(`/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    credentials: 'same-origin',
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `auth_register_${res.status}`)
  }
  const data = (await res.json()) as { token: string; user: AuthUser }
  return data
}

/**
 * Giriş: aynı şekilde proxy route üzerinden gider. Cookie HttpOnly;
 * `localStorage` yedeği `Authorization: Bearer ...` API çağrıları için.
 */
export async function loginUser(body: {
  email: string
  password: string
}): Promise<{ token: string; user: AuthUser }> {
  const res = await fetch(`/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    credentials: 'same-origin',
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `auth_login_${res.status}`)
  }
  const data = (await res.json()) as { token: string; user: AuthUser }
  return data
}

export type TcVerificationAdminRequestRow = {
  id: string
  user_id: string
  email: string
  display_name: string
  tc_kimlik_no: string
  first_name: string
  last_name: string
  birth_year: string
  submitted_at: string
}

/** Oturumlu kullanıcı — TC kimlik doğrulama başvurusu (yönetici onayı kuyruğu). */
export async function submitTcVerificationRequest(
  token: string,
  body: {
    tc_kimlik_no: string
    first_name: string
    last_name: string
    birth_year: number
  },
): Promise<{ ok: boolean }> {
  const res = await fetch(`/api/auth/tc-verification`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    credentials: 'same-origin',
    cache: 'no-store',
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `tc_verify_submit_${res.status}`)
  }
  return json(res)
}

/** Yönetici: bekleyen TC başvuruları (`admin.tc_verification.review`). */
export async function listAdminTcVerificationRequests(
  token: string,
): Promise<{ requests: TcVerificationAdminRequestRow[] }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/admin/tc-verifications`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `admin_tc_list_${res.status}`)
  }
  return json(res)
}

export async function reviewAdminTcVerificationRequest(
  token: string,
  requestId: string,
  body: { decision: 'approve' | 'reject'; admin_note?: string },
): Promise<{ ok: boolean }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(
    `${b}/api/v1/admin/tc-verifications/${encodeURIComponent(requestId)}/review`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      cache: 'no-store',
    },
  )
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `admin_tc_review_${res.status}`)
  }
  return json(res)
}

export async function getAuthMe(
  token: string,
): Promise<
  AuthUser & { preferred_locale: string; roles: RoleAssignment[]; permissions: string[] }
> {
  const res = await fetch(`/api/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
    credentials: 'same-origin',
    cache: 'no-store',
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `auth_me_${res.status}`)
  }
  const me = await json<AuthUser & { preferred_locale: string; roles: RoleAssignment[]; permissions: string[] }>(res)
  setStoredAuthProfile({
    ...profileFieldsFromAuthUser(me),
    roles: me.roles,
    permissions: me.permissions,
  })
  return me
}

export async function patchAuthMe(
  token: string,
  body: { display_name: string; preferred_locale: string },
): Promise<
  AuthUser & { preferred_locale: string; roles: RoleAssignment[]; permissions: string[] }
> {
  const res = await fetch(`/api/auth/me`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    credentials: 'same-origin',
    cache: 'no-store',
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `auth_patch_${res.status}`)
  }
  return json(res)
}

export async function logoutUser(token: string): Promise<void> {
  const b = base()
  if (!b) return
  await fetch(`${b}/api/v1/auth/session`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  }).catch(() => null)
}

export async function changePassword(
  token: string,
  body: { current_password: string; new_password: string },
): Promise<{ ok: boolean }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/auth/change-password`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `change_pw_${res.status}`)
  }
  return json(res)
}

/** Şifre sıfırlama bağlantısı oluştur. `reset_token` dev ortamında döner; prod'da e-posta gönderilir. */
export async function forgotPassword(email: string): Promise<{ ok: boolean; reset_token?: string }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `forgot_pw_${res.status}`)
  }
  return json(res)
}

export async function resetPassword(
  body: { token: string; new_password: string },
): Promise<{ ok: boolean }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/auth/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `reset_pw_${res.status}`)
  }
  return json(res)
}

export type MyReservationRow = {
  id: string
  public_code: string
  status: string
  guest_name: string
  starts_on: string
  ends_on: string
  created_at: string
  /** İlan slug; yoksa boş veya alan gelmeyebilir. */
  listing_slug?: string
  /** Provizyon / ödeme durumu (`held`, `completed`, …). Eski API yanıtlarında eksik olabilir. */
  payment_status?: string
  amount_paid?: string
  currency_code?: string
  /** `product_categories.code` — doğru detay URL segmenti için. */
  listing_category_code?: string
}

export async function listMyReservations(token: string): Promise<{ reservations: MyReservationRow[] }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/reservations/mine`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(`reservations_mine_${res.status}`)
  return json(res)
}

export type ReservationLineDetail = {
  listing_id: string
  line_no: string
  quantity: string
  unit_price: string
  line_total: string
  starts_on: string
  ends_on: string
  meta_json?: string
}

export type ReservationDetail = {
  id: string
  public_code: string
  status: string
  guest_email: string
  guest_name: string
  starts_on: string
  ends_on: string
  price_breakdown_json: string
  created_at: string
  lines: ReservationLineDetail[]
}

export async function getReservationByPublicCode(
  code: string,
  guestEmail: string,
): Promise<ReservationDetail> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const q = new URLSearchParams({ guest_email: guestEmail })
  const res = await fetch(`${b}/api/v1/reservations/by-code/${encodeURIComponent(code)}?${q}`)
  if (!res.ok) throw new Error(`reservation_by_code_${res.status}`)
  return json(res)
}

// ── Provizyon (Escrow) Sistemi ──────────────────────────────────────────────

export type ProvizyonReservation = {
  id: string
  public_code: string
  status: string
  payment_status: string
  payment_type: 'full' | 'partial'
  guest_name: string
  starts_on: string
  ends_on: string
  amount_paid: string
  commission_amount: string
  supplier_prepaid_amount: string
  guest_due_at_checkin: string
  supplier_confirm_deadline: string
  listing_title: string
  payment_schedule_json: string
  created_at: string
}

export type PaymentSchedule = {
  reservation_code: string
  listing_title: string
  guest_name: string
  guest_email: string
  check_in: string
  check_out: string
  currency: string
  total_sale_price: number
  payment_type: string
  guest_schedule: {
    paid_now: number
    due_at_checkin: number
    due_to: string
  }
  supplier_schedule: {
    supplier_name: string
    total_due: number
    commission_deducted: number
    processing_fee: number
    transfer_at_checkin: number
    collect_from_guest: number
    payment_note: string
  }
  generated_at: string
}

export type EscalationRow = {
  id: string
  reservation_id: string
  public_code: string
  reason: string
  status: string
  assigned_to: string
  listing_title: string
  escalated_at: string
}

/** Tedarikçi token ile rezervasyonu görüntüler (auth gerekmez) */
export async function getProvizyonByToken(token: string): Promise<{ reservation: ProvizyonReservation }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/provizyon/${encodeURIComponent(token)}`)
  if (!res.ok) throw new Error(`provizyon_get_${res.status}`)
  return json(res)
}

/** Tedarikçi onayla */
export async function supplierConfirmReservation(token: string): Promise<{ ok: boolean; message: string }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/provizyon/${encodeURIComponent(token)}/confirm`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  })
  if (!res.ok) throw new Error(`provizyon_confirm_${res.status}`)
  return json(res)
}

/** Tedarikçi reddet */
export async function supplierCancelReservation(token: string, note?: string): Promise<{ ok: boolean; message: string }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/provizyon/${encodeURIComponent(token)}/cancel`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ note: note ?? '' }),
  })
  if (!res.ok) throw new Error(`provizyon_cancel_${res.status}`)
  return json(res)
}

/** Tedarikçinin kendi rezervasyonları */
export async function listSupplierReservations(token: string): Promise<{ reservations: ProvizyonReservation[] }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/supplier/reservations`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(`supplier_reservations_${res.status}`)
  return json(res)
}

/** Admin: provizyon listesi */
export async function adminListProvizyon(
  token: string,
  status?: string,
): Promise<{ reservations: ProvizyonReservation[]; count: number }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const q = status ? `?status=${encodeURIComponent(status)}` : ''
  const res = await fetch(`${b}/api/v1/admin/provizyon${q}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(`admin_provizyon_${res.status}`)
  return json(res)
}

/** Admin: deadline kontrolü tetikle */
export async function adminCheckDeadlines(token: string): Promise<{ escalated_count: number; escalated_codes: string[] }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/admin/provizyon/check-deadlines`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: '{}',
  })
  if (!res.ok) throw new Error(`admin_check_deadlines_${res.status}`)
  return json(res)
}

/** Admin: eskalasyon listesi */
export async function adminListEscalations(
  token: string,
  status = 'open',
): Promise<{ escalations: EscalationRow[] }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/admin/escalations?status=${encodeURIComponent(status)}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(`admin_escalations_${res.status}`)
  return json(res)
}

/** Admin: eskalasyon çözümle */
export async function adminResolveEscalation(
  token: string,
  escId: string,
  data: { status: string; note?: string; assigned_to?: string },
): Promise<{ ok: boolean }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/admin/escalations/${escId}/resolve`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error(`admin_resolve_escalation_${res.status}`)
  return json(res)
}

/** Admin: transfer kaydı ekle */
export async function adminAddTransfer(
  token: string,
  reservationId: string,
  data: { transfer_type: string; amount: string; notes?: string },
): Promise<{ ok: boolean; transfer_id: string }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/admin/provizyon/${reservationId}/transfer`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error(`admin_add_transfer_${res.status}`)
  return json(res)
}

/** Admin: transfer tamamlandı */
export async function adminCompleteTransfer(
  token: string,
  transferId: string,
  reference?: string,
): Promise<{ ok: boolean }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/admin/provizyon/transfers/${transferId}/complete`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ reference: reference ?? '' }),
  })
  if (!res.ok) throw new Error(`admin_complete_transfer_${res.status}`)
  return json(res)
}

/** G3.2 — acente kurumu (oturum + `agency` rolü gerekir) */
export type AgencyMe = {
  organization_id: string
  slug: string
  name: string
  document_status: string
  discount_percent: string
}

export async function getAgencyMe(token: string): Promise<AgencyMe> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/agency/me`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `agency_me_${res.status}`)
  }
  return json(res)
}

export type AgencyApiKeyRow = {
  id: string
  key_prefix: string
  label: string
  scopes: string[]
  created_at: string
}

export async function listAgencyApiKeys(token: string): Promise<{ api_keys: AgencyApiKeyRow[] }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/agency/api-keys`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `agency_keys_${res.status}`)
  }
  return json(res)
}

export async function createAgencyApiKey(
  token: string,
  body?: { label?: string },
): Promise<{ id: string; key_prefix: string; secret: string; scopes: string[] }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/agency/api-keys`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body ?? {}),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `agency_key_create_${res.status}`)
  }
  return json(res)
}

export async function deleteAgencyApiKey(token: string, keyId: string): Promise<{ ok: boolean }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/agency/api-keys/${encodeURIComponent(keyId)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `agency_key_delete_${res.status}`)
  }
  return json(res)
}

export type AgencyApiSettings = {
  webhook_url: string
  webhook_secret_set: boolean
  webhook_secret: string | null
  updated_at: string
  rate_limit_per_minute: number
}

export async function getAgencyApiSettings(token: string): Promise<AgencyApiSettings> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/agency/api-settings`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `agency_api_settings_${res.status}`)
  }
  return json(res)
}

export async function patchAgencyApiSettings(
  token: string,
  body: { webhook_url?: string; webhook_secret?: string },
): Promise<{ ok: boolean; webhook_url: string; webhook_secret_set: boolean; updated_at: string }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/agency/api-settings`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `agency_api_settings_patch_${res.status}`)
  }
  return json(res)
}

export type AgencyCommissionRateRow = {
  id: string
  supplier_organization_id: string
  commission_percent: string
}

export async function getAgencyCommissionRates(
  token: string,
): Promise<{ commission_rates: AgencyCommissionRateRow[] }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/agency/commission-rates`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `agency_rates_${res.status}`)
  }
  return json(res)
}

/** G3.2 — ciro özeti (`price_breakdown_json.total`); `from`/`to` = YYYY-MM-DD, boşsa son 30 gün */
export type AgencySalesSummary = {
  reservation_count: string
  gross_total: string
  /** `supplier_agency_commissions` ortalaması (%) */
  average_commission_percent?: string
  /** brüt × ortalama % / 100 (kabaca; tedarikçi başına oran farklı olabilir) */
  estimated_commission?: string
  by_status: Record<string, string>
}

export async function getAgencySalesSummary(
  token: string,
  query?: { from?: string; to?: string },
): Promise<AgencySalesSummary> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const q = new URLSearchParams()
  if (query?.from) q.set('from', query.from)
  if (query?.to) q.set('to', query.to)
  const qs = q.toString()
  const res = await fetch(`${b}/api/v1/agency/sales-summary${qs ? `?${qs}` : ''}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `agency_sales_${res.status}`)
  }
  return json(res)
}

export async function getAgentSalesSummary(
  apiKey: string,
  query?: { from?: string; to?: string },
): Promise<AgencySalesSummary> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const q = new URLSearchParams()
  if (query?.from) q.set('from', query.from)
  if (query?.to) q.set('to', query.to)
  const qs = q.toString()
  const res = await fetch(`${b}/api/v1/agent/sales-summary${qs ? `?${qs}` : ''}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `agent_sales_${res.status}`)
  }
  return json(res)
}

/** G3.2 — acente rezervasyonları (oturum; `agency` rolü) */
export async function getAgencyReservations(token: string): Promise<{ reservations: MyReservationRow[] }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/agency/reservations`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `agency_reservations_${res.status}`)
  }
  return json(res)
}

/** G3.3 — tedarikçi kurumu (`supplier_profiles` + `org_type = supplier`) */
export type SupplierMe = {
  organization_id: string
  slug: string
  name: string
  profile_created_at: string
}

export async function getSupplierMe(token: string): Promise<SupplierMe> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/supplier/me`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `supplier_me_${res.status}`)
  }
  return json(res)
}

export type SupplierListingRow = {
  id: string
  slug: string
  status: string
  currency_code: string
  commission_percent: string
  prepayment_amount: string
  prepayment_percent: string
  created_at: string
  share_to_social?: boolean
  allow_ai_caption?: boolean
}

export async function listSupplierListings(
  token: string,
  search?: string,
): Promise<{ listings: SupplierListingRow[] }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const q = new URLSearchParams()
  if (search?.trim()) q.set('search', search.trim())
  const qs = q.toString()
  const res = await fetch(`${b}/api/v1/supplier/listings${qs ? `?${qs}` : ''}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `supplier_listings_${res.status}`)
  }
  return json(res)
}

/** İlan komisyon % ve ön ödeme alanları — gönderilmeyen alan sunucuda değiştirilmez. */
export async function patchSupplierListing(
  token: string,
  listingId: string,
  body: {
    commission_percent?: string
    prepayment_amount?: string
    prepayment_percent?: string
  },
): Promise<{
  id: string
  commission_percent: string
  prepayment_amount: string
  prepayment_percent: string
}> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/supplier/listings/${encodeURIComponent(listingId)}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `supplier_listing_patch_${res.status}`)
  }
  return json(res)
}

export type SupplierAgencyCommissionRow = {
  id: string
  agency_organization_id: string
  commission_percent: string
}

export async function listSupplierAgencyCommissions(
  token: string,
): Promise<{ agency_commissions: SupplierAgencyCommissionRow[] }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/supplier/agency-commissions`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `supplier_sac_${res.status}`)
  }
  return json(res)
}

export async function upsertSupplierAgencyCommission(
  token: string,
  body: { agency_organization_id?: string; commission_percent: string },
): Promise<{ agency_commission: SupplierAgencyCommissionRow }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/supplier/agency-commissions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `supplier_sac_upsert_${res.status}`)
  }
  return json(res)
}

export async function deleteSupplierAgencyCommission(
  token: string,
  commissionId: string,
): Promise<{ ok: boolean }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/supplier/agency-commissions/${encodeURIComponent(commissionId)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `supplier_sac_del_${res.status}`)
  }
  return json(res)
}

export type SupplierPromotionFeeRuleRow = {
  id: string
  rule_type: string
  extra_commission_percent: string
  created_at: string
}

export async function listSupplierPromotionFeeRules(
  token: string,
): Promise<{ promotion_fee_rules: SupplierPromotionFeeRuleRow[] }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/supplier/promotion-fee-rules`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `supplier_promo_${res.status}`)
  }
  return json(res)
}

export async function upsertSupplierPromotionFeeRule(
  token: string,
  body: { rule_type: string; extra_commission_percent: string },
): Promise<{ promotion_fee_rule: SupplierPromotionFeeRuleRow }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/supplier/promotion-fee-rules`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `supplier_promo_upsert_${res.status}`)
  }
  return json(res)
}

export async function deleteSupplierPromotionFeeRule(token: string, ruleId: string): Promise<{ ok: boolean }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/supplier/promotion-fee-rules/${encodeURIComponent(ruleId)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `supplier_promo_del_${res.status}`)
  }
  return json(res)
}

/** G3.4–G3.5 — yönetici RBAC (Bearer + `admin.*` izinleri) */
export type AdminUserRow = {
  id: string
  email: string
  display_name: string
  created_at: string
}

export async function listAdminUsers(token: string, search?: string): Promise<{ users: AdminUserRow[] }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const q = new URLSearchParams()
  if (search?.trim()) q.set('search', search.trim())
  const qs = q.toString()
  const res = await fetch(`${b}/api/v1/admin/users${qs ? `?${qs}` : ''}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `admin_users_${res.status}`)
  }
  return json(res)
}

export type AdminRoleAssignment = {
  role_code: string
  organization_id: string | null
}

export async function getAdminUserRoles(
  token: string,
  userId: string,
): Promise<{ user_id: string; roles: AdminRoleAssignment[] }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const q = new URLSearchParams({ user_id: userId })
  const res = await fetch(`${b}/api/v1/admin/user-roles?${q}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `admin_user_roles_${res.status}`)
  }
  return json(res)
}

export async function updateAdminUserRole(
  token: string,
  body: { user_id: string; role_code: string; organization_id?: string; op: 'grant' | 'revoke' },
): Promise<{ user_id: string; roles: AdminRoleAssignment[] }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/admin/user-roles`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `admin_user_role_${res.status}`)
  }
  return json(res)
}

export type AdminAuditEvent = {
  id: string
  user_id: string | null
  organization_id: string | null
  action: string
  target_type: string
  created_at: string
}

export async function listAdminAuditLog(
  token: string,
  query?: { user_id?: string },
): Promise<{ events: AdminAuditEvent[] }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const q = new URLSearchParams()
  if (query?.user_id?.trim()) q.set('user_id', query.user_id.trim())
  const qs = q.toString()
  const res = await fetch(`${b}/api/v1/admin/audit-log${qs ? `?${qs}` : ''}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `admin_audit_${res.status}`)
  }
  return json(res)
}

export type AdminAgencyCategoryGrantRow = {
  id: string
  agency_organization_id: string
  agency_name: string
  category_code: string
  approved: string
}

export async function listAdminAgencyCategoryGrants(
  token: string,
  query?: { agency_organization_id?: string },
): Promise<{ grants: AdminAgencyCategoryGrantRow[] }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const q = new URLSearchParams()
  if (query?.agency_organization_id?.trim()) q.set('agency_organization_id', query.agency_organization_id.trim())
  const qs = q.toString()
  const res = await fetch(`${b}/api/v1/admin/agency-category-grants${qs ? `?${qs}` : ''}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `admin_acg_${res.status}`)
  }
  return json(res)
}

export async function upsertAdminAgencyCategoryGrant(
  token: string,
  body: { agency_organization_id: string; category_code: string; approved: boolean },
): Promise<{ grant: AdminAgencyCategoryGrantRow }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/admin/agency-category-grants`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `admin_acg_upsert_${res.status}`)
  }
  return json(res)
}

export type AdminAgencyProfileRow = {
  user_id: string
  email: string
  document_status: string
  discount_percent: string
  /** Backend `agency_organization_id` boş gönderildiğinde tüm acente profilleri döner;
   *  bu alanlar tek-kurum modunda da geriye dönük uyumlu olarak doldurulur. */
  organization_id?: string
  organization_slug?: string
  organization_name?: string
  tursab_license_no?: string
  tursab_verify_url?: string
  created_at?: string
}

export async function listAdminAgencyProfiles(
  token: string,
  /** Boş bırakılırsa tüm acente profilleri (admin TÜRSAB doğrulama paneli için) listelenir. */
  agencyOrganizationId: string,
  /** Opsiyonel `pending` | `approved` | `rejected` filtresi. */
  status?: string,
): Promise<{ profiles: AdminAgencyProfileRow[] }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const params: Record<string, string> = { agency_organization_id: agencyOrganizationId.trim() }
  if (status && status.trim() !== '') params.status = status.trim()
  const q = new URLSearchParams(params)
  const res = await fetch(`${b}/api/v1/admin/agency-profiles?${q}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `admin_aprof_${res.status}`)
  }
  return json(res)
}

export async function patchAdminAgencyProfiles(
  token: string,
  body: {
    agency_organization_id: string
    document_status?: string
    discount_percent?: string
  },
): Promise<{ updated_count: string }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/admin/agency-profiles`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `admin_aprof_patch_${res.status}`)
  }
  return json(res)
}

export type AdminPermissionCatalogEntry = { code: string; description: string }

export async function listAdminPermissions(token: string): Promise<{
  permissions: AdminPermissionCatalogEntry[]
  matrix_installed?: boolean
}> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/admin/permissions`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `admin_permissions_${res.status}`)
  }
  return json(res)
}

export type AdminRolePermissionEntry = { role_code: string; permission_code: string }

export async function listAdminRolePermissions(token: string): Promise<{
  entries: AdminRolePermissionEntry[]
  matrix_installed?: boolean
}> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/admin/role-permissions`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `admin_role_permissions_${res.status}`)
  }
  return json(res)
}

export async function updateAdminRolePermission(
  token: string,
  body: { role_code: string; permission_code: string; op: 'grant' | 'revoke' },
): Promise<{ ok: boolean; role_code: string; permission_code: string }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/admin/role-permissions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `admin_role_permissions_${res.status}`)
  }
  return json(res)
}

/** G3.2/G3.3 — satır kalemlerinden tahmini komisyon (`confirmed`/`completed`, `reservation_line_items.line_total`). */
export type AgencyCommissionAccruals = {
  reservation_count: string
  gross_total: string
  commission_total: string
}

export async function getAgencyCommissionAccruals(
  token: string,
  query?: { from?: string; to?: string },
): Promise<AgencyCommissionAccruals> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const q = new URLSearchParams()
  if (query?.from) q.set('from', query.from)
  if (query?.to) q.set('to', query.to)
  const qs = q.toString()
  const res = await fetch(`${b}/api/v1/agency/commission-accruals${qs ? `?${qs}` : ''}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `agency_commission_accruals_${res.status}`)
  }
  return json(res)
}

export type SupplierCommissionAccrualsByAgencyRow = {
  agency_organization_id: string | null
  gross_total: string
  commission_total: string
}

export type SupplierCommissionAccruals = {
  reservation_count: string
  gross_total: string
  commission_total: string
  by_agency: SupplierCommissionAccrualsByAgencyRow[]
}

export async function getSupplierCommissionAccruals(
  token: string,
  query?: { from?: string; to?: string },
): Promise<SupplierCommissionAccruals> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const q = new URLSearchParams()
  if (query?.from) q.set('from', query.from)
  if (query?.to) q.set('to', query.to)
  const qs = q.toString()
  const res = await fetch(`${b}/api/v1/supplier/commission-accruals${qs ? `?${qs}` : ''}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `supplier_commission_accruals_${res.status}`)
  }
  return json(res)
}

/** Kalıcı tahakkuk satırları (`commission_accrual_lines`; ödeme capture sonrası; `created_at` filtresi). */
export type PersistedCommissionAccruals = {
  accrual_line_count: string
  gross_total: string
  commission_total: string
}

export async function getAgencyPersistedCommissionAccruals(
  token: string,
  query?: { from?: string; to?: string },
): Promise<PersistedCommissionAccruals> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const q = new URLSearchParams()
  if (query?.from) q.set('from', query.from)
  if (query?.to) q.set('to', query.to)
  const qs = q.toString()
  const res = await fetch(`${b}/api/v1/agency/persisted-commission-accruals${qs ? `?${qs}` : ''}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `agency_persisted_commission_${res.status}`)
  }
  return json(res)
}

export async function getSupplierPersistedCommissionAccruals(
  token: string,
  query?: { from?: string; to?: string },
): Promise<PersistedCommissionAccruals> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const q = new URLSearchParams()
  if (query?.from) q.set('from', query.from)
  if (query?.to) q.set('to', query.to)
  const qs = q.toString()
  const res = await fetch(`${b}/api/v1/supplier/persisted-commission-accruals${qs ? `?${qs}` : ''}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `supplier_persisted_commission_${res.status}`)
  }
  return json(res)
}

/** G3.2 — kalıcı tahhakkuk satırlarından komisyon faturası (190_agency_invoices). */
export type AgencyInvoiceRow = {
  id: string
  period_from: string
  period_to: string
  currency_code: string
  gross_total: string
  commission_total: string
  line_count: string
  status: string
  invoice_number: string
  notes: string
  created_at: string
}

export type AgencyInvoiceLineRow = {
  id: string
  commission_accrual_line_id: string
  reservation_id: string
  public_code: string
  gross_amount: string
  commission_amount: string
  currency_code: string
}

export type AgencyInvoiceDetailResponse = {
  invoice: AgencyInvoiceRow
  lines: AgencyInvoiceLineRow[]
}

export async function listAgencyInvoices(token: string): Promise<{ invoices: AgencyInvoiceRow[] }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/agency/invoices`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `agency_invoices_${res.status}`)
  }
  return json(res)
}

export async function getAgencyInvoiceDetail(
  token: string,
  invoiceId: string,
): Promise<AgencyInvoiceDetailResponse> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/agency/invoices/${encodeURIComponent(invoiceId)}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `agency_invoice_detail_${res.status}`)
  }
  return json(res)
}

export type AgencyInvoicePreview = {
  period_from: string
  period_to: string
  currency_code: string
  line_count: string
  gross_total: string
  commission_total: string
}

export async function previewAgencyInvoice(
  token: string,
  body: { period_from: string; period_to: string; currency_code?: string },
): Promise<AgencyInvoicePreview> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/agency/invoices/preview`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      period_from: body.period_from,
      period_to: body.period_to,
      ...(body.currency_code?.trim() ? { currency_code: body.currency_code.trim() } : {}),
    }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `agency_invoice_preview_${res.status}`)
  }
  return json(res)
}

export type AgencyInvoiceCreateResult = {
  id: string
  invoice_number: string
  currency_code: string
  line_count: number
  gross_total: string
  commission_total: string
}

export async function createAgencyInvoice(
  token: string,
  body: { period_from: string; period_to: string; currency_code?: string; notes?: string },
): Promise<AgencyInvoiceCreateResult> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/agency/invoices`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      period_from: body.period_from,
      period_to: body.period_to,
      ...(body.currency_code?.trim() ? { currency_code: body.currency_code.trim() } : {}),
      ...(body.notes?.trim() ? { notes: body.notes.trim() } : {}),
    }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `agency_invoice_create_${res.status}`)
  }
  return json(res)
}

export async function cancelAgencyInvoice(
  token: string,
  invoiceId: string,
): Promise<{ id: string; status: string }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/agency/invoices/${encodeURIComponent(invoiceId)}/cancel`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `agency_invoice_cancel_${res.status}`)
  }
  return json(res)
}

export async function patchAgencyInvoiceNotes(
  token: string,
  invoiceId: string,
  notes: string,
): Promise<{ id: string; notes: string }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/agency/invoices/${encodeURIComponent(invoiceId)}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ notes }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `agency_invoice_notes_${res.status}`)
  }
  return json(res)
}

/** G3.3 — kalıcı tahakkuk satırlarından tedarikçi komisyon faturası (191_supplier_invoices). */
export type SupplierInvoiceRow = {
  id: string
  period_from: string
  period_to: string
  currency_code: string
  gross_total: string
  commission_total: string
  line_count: string
  status: string
  invoice_number: string
  notes: string
  created_at: string
}

export type SupplierInvoiceLineRow = {
  id: string
  commission_accrual_line_id: string
  reservation_id: string
  public_code: string
  gross_amount: string
  commission_amount: string
  currency_code: string
}

export type SupplierInvoiceDetailResponse = {
  invoice: SupplierInvoiceRow
  lines: SupplierInvoiceLineRow[]
}

export async function listSupplierInvoices(token: string): Promise<{ invoices: SupplierInvoiceRow[] }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/supplier/invoices`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `supplier_invoices_${res.status}`)
  }
  return json(res)
}

export async function getSupplierInvoiceDetail(
  token: string,
  invoiceId: string,
): Promise<SupplierInvoiceDetailResponse> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/supplier/invoices/${encodeURIComponent(invoiceId)}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `supplier_invoice_detail_${res.status}`)
  }
  return json(res)
}

export type SupplierInvoicePreview = {
  period_from: string
  period_to: string
  currency_code: string
  line_count: string
  gross_total: string
  commission_total: string
}

export async function previewSupplierInvoice(
  token: string,
  body: { period_from: string; period_to: string; currency_code?: string },
): Promise<SupplierInvoicePreview> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/supplier/invoices/preview`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      period_from: body.period_from,
      period_to: body.period_to,
      ...(body.currency_code?.trim() ? { currency_code: body.currency_code.trim() } : {}),
    }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `supplier_invoice_preview_${res.status}`)
  }
  return json(res)
}

export type SupplierInvoiceCreateResult = {
  id: string
  invoice_number: string
  currency_code: string
  line_count: number
  gross_total: string
  commission_total: string
}

export async function createSupplierInvoice(
  token: string,
  body: { period_from: string; period_to: string; currency_code?: string; notes?: string },
): Promise<SupplierInvoiceCreateResult> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/supplier/invoices`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      period_from: body.period_from,
      period_to: body.period_to,
      ...(body.currency_code?.trim() ? { currency_code: body.currency_code.trim() } : {}),
      ...(body.notes?.trim() ? { notes: body.notes.trim() } : {}),
    }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `supplier_invoice_create_${res.status}`)
  }
  return json(res)
}

export async function cancelSupplierInvoice(
  token: string,
  invoiceId: string,
): Promise<{ id: string; status: string }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/supplier/invoices/${encodeURIComponent(invoiceId)}/cancel`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `supplier_invoice_cancel_${res.status}`)
  }
  return json(res)
}

export async function patchSupplierInvoiceNotes(
  token: string,
  invoiceId: string,
  notes: string,
): Promise<{ id: string; notes: string }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/supplier/invoices/${encodeURIComponent(invoiceId)}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ notes }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `supplier_invoice_notes_${res.status}`)
  }
  return json(res)
}

/** Acente — yayında ilan arama (satış akışı). */
export type AgencyBrowseListingRow = {
  id: string
  slug: string
  currency_code: string
  title: string
  first_charge_amount: string
  prepayment_amount: string
  supplier_organization_id: string
}

export async function getAgencyBrowseListings(
  token: string,
  search?: string,
): Promise<{ listings: AgencyBrowseListingRow[] }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const q = new URLSearchParams()
  if (search?.trim()) q.set('search', search.trim())
  const qs = q.toString()
  const res = await fetch(`${b}/api/v1/agency/browse-listings${qs ? `?${qs}` : ''}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `agency_browse_${res.status}`)
  }
  return json(res)
}

/** G3.4 — personel (`staff` rolü + kurum). */
export type StaffMe = {
  organization_id: string
  slug: string
  name: string
}

export async function getStaffMe(token: string): Promise<StaffMe> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/staff/me`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `staff_me_${res.status}`)
  }
  return json(res)
}

export type StaffReservationRow = {
  id: string
  public_code: string
  status: string
  guest_email: string
  listing_slug: string
  created_at: string
}

export async function getStaffReservations(token: string): Promise<{ reservations: StaffReservationRow[] }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/staff/reservations`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `staff_reservations_${res.status}`)
  }
  const text = await res.text()
  try {
    return parseLenientJson(text) as { reservations: StaffReservationRow[] }
  } catch {
    throw new Error(`staff_reservations_invalid_json`)
  }
}

export async function getAdminReservations(
  token: string,
  opts?: { status?: string; search?: string; limit?: number },
): Promise<{ reservations: StaffReservationRow[] }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const q = new URLSearchParams()
  if (opts?.status) q.set('status', opts.status)
  if (opts?.search) q.set('search', opts.search)
  if (opts?.limit) q.set('limit', String(opts.limit))
  const qs = q.toString()
  const res = await fetch(`${b}/api/v1/admin/reservations${qs ? `?${qs}` : ''}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `admin_reservations_${res.status}`)
  }
  return json(res)
}

/** Admin dashboard — `listings.status = published` toplamı (`admin.users.read`). */
export async function getAdminCatalogDashboardStats(
  token: string,
): Promise<{ published_listings: number }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/admin/catalog/dashboard-stats`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `admin_catalog_dashboard_stats_${res.status}`)
  }
  return json(res)
}

/** Personel — kurum ilanları (salt okuma; tedarikçi paneli ile aynı alanlar). */
export type StaffListingRow = SupplierListingRow

export async function listStaffListings(
  token: string,
  search?: string,
): Promise<{ listings: StaffListingRow[] }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const q = new URLSearchParams()
  if (search?.trim()) q.set('search', search.trim())
  const qs = q.toString()
  const res = await fetch(`${b}/api/v1/staff/listings${qs ? `?${qs}` : ''}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `staff_listings_${res.status}`)
  }
  return json(res)
}

export type StaffInvoiceRow = {
  kind: 'agency' | 'supplier'
  id: string
  period_from: string
  period_to: string
  currency_code: string
  gross_total: string
  commission_total: string
  line_count: string
  status: string
  invoice_number: string
  notes: string
  created_at: string
}

export async function getStaffInvoices(token: string): Promise<{ invoices: StaffInvoiceRow[] }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/staff/invoices`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `staff_invoices_${res.status}`)
  }
  return json(res)
}

/** Madde 4 — personel POS: kasa sepeti (kurum ilanları, `staff.pos.write`). */
export async function createStaffPosCart(
  token: string,
  currencyCode: string,
): Promise<CreateCartRes> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/staff/pos/carts`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ currency_code: currencyCode }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `staff_pos_cart_${res.status}`)
  }
  return json(res)
}

export async function addStaffPosCartLine(
  token: string,
  cartId: string,
  body: {
    listing_id: string
    quantity: number
    starts_on: string
    ends_on: string
    unit_price: string
  },
): Promise<{ id: string; cart_id: string }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/staff/pos/carts/${encodeURIComponent(cartId)}/lines`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `staff_pos_line_${res.status}`)
  }
  return json(res)
}

export async function checkoutStaffPosCart(
  token: string,
  cartId: string,
  body: {
    guest_email: string
    guest_name: string
    guest_phone?: string
    hold_minutes?: number
    contract_accepted: boolean
    general_contract_accepted?: boolean
    sales_contract_accepted?: boolean
    contract_locale?: string
  },
): Promise<CheckoutRes> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/staff/pos/carts/${encodeURIComponent(cartId)}/checkout`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `staff_pos_checkout_${res.status}`)
  }
  return json(res)
}

/** G3.2 — API anahtarı ile kurum özeti (`Authorization: Bearer trk_live_...`) */
export async function getAgentMe(apiKey: string): Promise<{
  organization_id: string
  key_prefix: string
  scopes: string[]
  catalog_categories?: string[]
}> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/agent/me`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `agent_me_${res.status}`)
  }
  return json(res)
}

/** G3.2 — API anahtarı ile rezervasyon listesi (`reservations.read` kapsamı) */
export async function listAgentReservations(apiKey: string): Promise<{ reservations: MyReservationRow[] }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/agent/reservations`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `agent_reservations_${res.status}`)
  }
  return json(res)
}

/** G3.0 — sistem rol kodları (açıklamalarıyla) */
export async function listRoles(): Promise<{ roles: RoleCatalogEntry[] }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/roles`)
  if (!res.ok) throw new Error(`roles_list_${res.status}`)
  return json(res)
}

// --- Paratika HPP + aktif ödeme sağlayıcı ---

export type ActivePaymentProviderRes = {
  active: string | null
  display_name?: string
}

export async function getActivePaymentProvider(): Promise<ActivePaymentProviderRes> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/payments/active-provider`)
  if (!res.ok) throw new Error(`active_provider_${res.status}`)
  return json(res)
}

export type CheckoutPaymentMethodsApiRes = {
  bank_transfer: {
    iban_try: string
    iban_eur: string
    iban_usd: string
    iban_gbp: string
    note: string
  }
  western_union: string
  ria: string
}

/** Vitrin checkout — havale / Western Union / Ria talimatları (herkese açık) */
export async function getCheckoutPaymentMethods(): Promise<CheckoutPaymentMethodsApiRes> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/payments/checkout-methods`, { cache: 'no-store' })
  if (!res.ok) throw new Error(`checkout_payment_methods_${res.status}`)
  return json(res)
}

export async function setActivePaymentProvider(
  code: 'paytr' | 'paratika',
  token: string,
): Promise<{ ok: boolean; active: string }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/payments/active-provider`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ code }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `active_provider_set_${res.status}`)
  }
  return json(res)
}

export type ParatikaSessionRes = {
  status: string
  session_token: string
  payment_url: string
  direct_post_3d_url: string
  /** direct_post | hpp_iframe | hpp_redirect */
  checkout_ui: string
}

/** Paratika Ortak Ödeme Sayfası — SESSIONTOKEN; `merchant_oid` = rezervasyon UUID. */
export async function paratikaSessionToken(input: {
  merchant_oid: string
  payment_amount: string
  email: string
  user_ip: string
  currency?: string
  user_name?: string
  guest_phone?: string
  order_title?: string
}): Promise<ParatikaSessionRes> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/integrations/paratika/session-token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `paratika_session_${res.status}`)
  }
  return json(res)
}

// --- Sosyal paylaşım (şablon + kuyruk + ilan bayrakları) ---

export type SocialNetwork = 'instagram' | 'facebook' | 'twitter' | 'pinterest'

/** Story/Reel şimdilik yalnız Instagram üzerinden desteklenir (bkz. social-video-generate). */
export type SocialPostType = 'feed' | 'story' | 'reel'

export type SocialTemplate = {
  id: string
  network: string
  name: string
  template_body: string
  created_at: string
}

export async function listSocialTemplates(token: string): Promise<{ templates: SocialTemplate[] }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/social/templates`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `social_templates_${res.status}`)
  }
  return json(res)
}

export async function createSocialTemplate(
  token: string,
  body: {
    network: SocialNetwork
    name: string
    template_body: string
  },
): Promise<SocialTemplate> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/social/templates`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `social_template_create_${res.status}`)
  }
  return json(res)
}

export async function listSocialListings(
  token: string,
  params?: {
    categoryCode?: string
    search?: string
    titleLocale?: string
    limit?: number
    offset?: number
  },
): Promise<ManageCatalogListingsResult> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const q = new URLSearchParams()
  if (params?.categoryCode) q.set('category_code', params.categoryCode)
  if (params?.search?.trim()) q.set('search', params.search.trim())
  if (params?.titleLocale?.trim()) q.set('title_locale', params.titleLocale.trim().toLowerCase())
  if (params?.limit != null && params.limit >= 1) q.set('limit', String(Math.floor(params.limit)))
  if (params?.offset != null && params.offset >= 0) q.set('offset', String(Math.floor(params.offset)))
  const res = await fetch(`${b}/api/v1/social/listings${q.toString() ? `?${q}` : ''}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `social_listings_${res.status}`)
  }
  const data = await json<{
    listings: ManageListingRow[]
    total?: number
    page?: number
    per_page?: number
  }>(res)
  const listings = data.listings ?? []
  return {
    listings,
    total: data.total ?? listings.length,
    page: data.page ?? 1,
    per_page: data.per_page ?? listings.length,
  }
}

export type SocialShareJob = {
  id: string
  entity_type: string
  entity_id: string
  network?: string
  post_type?: SocialPostType
  template_id: string | null
  status: string
  caption_ai_generated: string | null
  error_message?: string | null
  image_keys: string[]
  created_at: string
}

export type SocialWorkerProcessResult = {
  ok: boolean
  enqueued?: number
  processed: number
  posted: number
  failed: number
  results?: Array<{
    ok: boolean
    network: string
    post_type?: SocialPostType
    job_id: string
    post_id?: string
    error?: string
  }>
  error?: string
}

export async function listSocialJobs(
  token: string,
  params?: { status?: string; limit?: number },
): Promise<{ jobs: SocialShareJob[] }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const q = new URLSearchParams()
  if (params?.status) q.set('status', params.status)
  if (params?.limit != null) q.set('limit', String(params.limit))
  const res = await fetch(`${b}/api/v1/social/jobs${q.toString() ? `?${q}` : ''}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `social_jobs_${res.status}`)
  }
  return json(res)
}

export async function processSocialPendingJobs(
  token: string,
  params?: { limit?: number; rotate?: boolean },
): Promise<SocialWorkerProcessResult> {
  const q = new URLSearchParams()
  if (params?.limit != null) q.set('limit', String(params.limit))
  if (params?.rotate === false) q.set('rotate', '0')
  const res = await fetch(`/api/social/worker-process${q.toString() ? `?${q}` : ''}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  })
  const data = await res.json().catch(() => ({ ok: false, error: `social_worker_${res.status}` })) as SocialWorkerProcessResult
  if (!res.ok) {
    throw new Error(data.error ?? `social_worker_${res.status}`)
  }
  return data
}

export async function createSocialJob(
  token: string,
  body: {
    entity_type: string
    entity_id: string
    network?: SocialNetwork
    post_type?: SocialPostType
    template_id?: string
    image_keys: string[]
    caption_ai_generated?: string
  },
): Promise<{ id: string; status: string }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/social/jobs`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `social_job_create_${res.status}`)
  }
  return json(res)
}

export async function generateSocialCover(body: {
  listing: Pick<ManageListingRow, 'id' | 'slug' | 'title' | 'category_code'> & { theme_codes?: string }
  quality: 'low' | 'medium' | 'high'
  design_theme: string
  prompt_hint?: string
}): Promise<{ ok: boolean; url: string; storage_key: string; quality: string; design_theme: string }> {
  const res = await fetch('/api/social/generate-cover', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `social_cover_generate_${res.status}`)
  }
  return json(res)
}

/** Sunucu taraflı Facebook paylaşım API rotasını çağırır. */
export async function postListingToFacebook(
  token: string,
  listingId: string,
  caption?: string,
  listingMeta?: { title?: string; handle?: string; category_code?: string },
): Promise<{
  ok: boolean
  post_id?: string
  post_url?: string
  listing_url?: string
  job_id?: string
  message_preview?: string
  error?: string
  hint?: string
}> {
  const res = await fetch('/api/social/facebook-post', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      listing_id: listingId,
      caption,
      listing_title: listingMeta?.title,
      listing_handle: listingMeta?.handle,
      listing_category_code: listingMeta?.category_code,
    }),
  })
  const data = await res.json().catch(() => ({ ok: false, error: `http_${res.status}` })) as {
    ok: boolean; post_id?: string; post_url?: string; listing_url?: string
    job_id?: string; message_preview?: string; error?: string; hint?: string
  }
  if (!res.ok && !data.error) data.error = `facebook_post_${res.status}`
  return data
}

export async function patchListingSocial(
  token: string,
  listingId: string,
  body: { share_to_social: boolean; allow_ai_caption: boolean },
): Promise<{ id: string; share_to_social: boolean; allow_ai_caption: boolean }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/listings/${encodeURIComponent(listingId)}/social`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `listing_social_${res.status}`)
  }
  return json(res)
}

// --- Medya (CDN, dosya kaydı, ilan görselleri) ---

export type CdnActiveRes =
  | { active: null }
  | { active: string; pull_zone_url: string | null; is_active: boolean }

export async function getActiveCdn(): Promise<CdnActiveRes> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/media/cdn`)
  if (!res.ok) throw new Error(`media_cdn_${res.status}`)
  return json(res)
}

export async function setActiveCdn(code: 'bunny' | 'cloudflare'): Promise<{ ok: boolean; active: string }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/media/cdn/active`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `media_cdn_set_${res.status}`)
  }
  return json(res)
}

export async function deactivateCdn(): Promise<{ ok: boolean }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/media/cdn/deactivate`, { method: 'POST' })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `media_cdn_deactivate_${res.status}`)
  }
  return json(res)
}

export async function updateCdnPullZoneUrl(
  code: 'bunny' | 'cloudflare',
  pull_zone_url: string,
): Promise<{ ok: boolean }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/media/cdn/url`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, pull_zone_url }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `media_cdn_url_${res.status}`)
  }
  return json(res)
}

export type CdnProviderRecord = {
  code: 'bunny' | 'cloudflare'
  pull_zone_url: string | null
  is_active: boolean
  config_json: Record<string, string>
}

export async function getAllCdnProviders(): Promise<CdnProviderRecord[]> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/media/cdn/all`)
  if (!res.ok) throw new Error(`media_cdn_all_${res.status}`)
  // `json()` helper'ı parseLenientJson + 200/non-JSON tespiti yapar.
  const rows = await json<Array<{ code: string; pull_zone_url: string | null; is_active: boolean; config_json: string }>>(res)
  return rows.map((r) => ({
    code: r.code as 'bunny' | 'cloudflare',
    pull_zone_url: r.pull_zone_url ?? null,
    is_active: r.is_active,
    config_json: (() => { try { return JSON.parse(r.config_json) } catch { return {} } })(),
  }))
}

export async function updateCdnConfig(
  code: 'bunny' | 'cloudflare',
  pull_zone_url: string,
  config: Record<string, string>,
): Promise<{ ok: boolean }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/media/cdn/config`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, pull_zone_url, config_json: JSON.stringify(config) }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `media_cdn_config_${res.status}`)
  }
  return json(res)
}

// ---------------------------------------------------------------------------
// Image upload profiles (260_image_upload_profiles)
// ---------------------------------------------------------------------------

export type ImageUploadProfile = {
  folder: string
  width: number
  height: number
  fit: 'cover' | 'inside'
  vivid: boolean
  quality: number
  effort: number
  thumb_size: number
  description: string
  display_order: number
}

export async function getImageUploadProfiles(): Promise<ImageUploadProfile[]> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/media/image-profiles`, { cache: 'no-store' })
  if (!res.ok) throw new Error(`image_profiles_${res.status}`)
  const rows = await json<Array<ImageUploadProfile & { fit: string }>>(res)
  return rows.map((r) => ({
    ...r,
    fit: r.fit === 'inside' ? 'inside' : 'cover',
  }))
}

export async function updateImageUploadProfile(
  profile: Pick<
    ImageUploadProfile,
    'folder' | 'width' | 'height' | 'fit' | 'vivid' | 'quality' | 'effort' | 'thumb_size'
  >,
): Promise<{ ok: boolean }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/media/image-profiles`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(profile),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `image_profile_update_${res.status}`)
  }
  return json(res)
}

export async function registerMediaFile(body: {
  owner_type: string
  owner_id: string
  original_storage_key: string
  original_mime: string
  width?: number
  height?: number
  byte_size?: number
}): Promise<{ id: string; status: string }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/media/files`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `media_file_register_${res.status}`)
  }
  return json(res)
}

export async function patchMediaFile(
  fileId: string,
  body: { avif_storage_key?: string; width?: number; height?: number },
): Promise<{ ok: boolean }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/media/files/${encodeURIComponent(fileId)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `media_file_patch_${res.status}`)
  }
  return json(res)
}

export type ListingImage = {
  id: string
  sort_order: number
  storage_key: string
  original_mime: string
  alt_text_key: string | null
  created_at: string
  /** Vitrin sırası (deniz, havuz, salon …); null = otomatik “unspecified” */
  scene_code?: string | null
}

function listingImagesQuery(organizationId?: string) {
  const o = organizationId?.trim()
  if (!o) return ''
  return `?organization_id=${encodeURIComponent(o)}`
}

export async function listListingImages(
  token: string,
  listingId: string,
  organizationId?: string,
): Promise<{ images: ListingImage[] }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(
    `${b}/api/v1/listings/${encodeURIComponent(listingId)}/images${listingImagesQuery(organizationId)}`,
    { headers: { Authorization: `Bearer ${token}` } },
  )
  if (!res.ok) throw new Error(`listing_images_${res.status}`)
  return json(res)
}

export async function addListingImage(
  token: string,
  listingId: string,
  body: { storage_key: string; original_mime?: string; sort_order?: number },
  organizationId?: string,
): Promise<{ id: string }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(
    `${b}/api/v1/listings/${encodeURIComponent(listingId)}/images${listingImagesQuery(organizationId)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    },
  )
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `listing_image_add_${res.status}`)
  }
  return json(res)
}

export async function deleteListingImage(
  token: string,
  listingId: string,
  imageId: string,
  organizationId?: string,
): Promise<{ ok: boolean; deleted_storage_key: string }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(
    `${b}/api/v1/listings/${encodeURIComponent(listingId)}/images/${encodeURIComponent(imageId)}${listingImagesQuery(organizationId)}`,
    { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } },
  )
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `listing_image_delete_${res.status}`)
  }
  return json(res)
}

export async function reorderListingImages(
  token: string,
  listingId: string,
  orderedImageIds: string[],
  organizationId?: string,
): Promise<{ ok: boolean }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(
    `${b}/api/v1/listings/${encodeURIComponent(listingId)}/images/order${listingImagesQuery(organizationId)}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ ordered_image_ids: orderedImageIds }),
    },
  )
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `listing_images_reorder_${res.status}`)
  }
  return json(res)
}

export async function patchListingImageScene(
  token: string,
  listingId: string,
  imageId: string,
  body: { scene_code: string | '' },
  organizationId?: string,
): Promise<{ ok: boolean; id: string }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(
    `${b}/api/v1/listings/${encodeURIComponent(listingId)}/images/${encodeURIComponent(imageId)}${listingImagesQuery(organizationId)}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    },
  )
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `listing_image_scene_${res.status}`)
  }
  return json(res)
}

/** Yayında ilan galerisi — auth yok; ön yüz vitrin sıralaması için */
export async function getPublicListingImages(listingId: string): Promise<{ images: ListingImage[] } | null> {
  const b = base()
  if (!b) return null
  const res = await fetch(
    `${b}/api/v1/catalog/public/listings/${encodeURIComponent(listingId)}/images`,
    { next: { revalidate: 120 } },
  )
  if (res.status === 404) return null
  if (!res.ok) return null
  return json(res)
}

// --- SEO (meta, JSON-LD, yönlendirme, sitemap özeti, 404 günlüğü) ---

export type SeoMetadata = {
  id: string
  title: string
  description: string
  keywords: string
  canonical_path: string
  og_image_storage_key: string
  robots: string
}

export async function getSeoMetadata(params: {
  entity_type: string
  entity_id: string
  locale?: string
}): Promise<{ metadata: SeoMetadata | null }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const q = new URLSearchParams({
    entity_type: params.entity_type,
    entity_id: params.entity_id,
    locale: params.locale ?? 'tr',
  })
  const res = await fetch(`${b}/api/v1/seo/metadata?${q}`)
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `seo_metadata_${res.status}`)
  }
  return json(res)
}

export async function upsertSeoMetadata(
  body: {
    entity_type: string
    entity_id: string
    locale: string
    title?: string
    description?: string
    keywords?: string
    canonical_path?: string
    og_image_storage_key?: string
    robots?: string
  },
  token: string,
): Promise<{ id: string; ok: boolean }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/seo/metadata`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `seo_metadata_upsert_${res.status}`)
  }
  return json(res)
}

export type StructuredSnippet = {
  schema_type: string
  /** JSON-LD metni; istemci `JSON.parse` ile obje üretebilir */
  json_ld: string
  updated_at: string
}

export async function listSeoSchema(params: {
  entity_type: string
  entity_id: string
}): Promise<{ snippets: StructuredSnippet[] }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const q = new URLSearchParams({
    entity_type: params.entity_type,
    entity_id: params.entity_id,
  })
  const res = await fetch(`${b}/api/v1/seo/schema?${q}`)
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `seo_schema_${res.status}`)
  }
  return json(res)
}

export async function upsertSeoSchema(
  body: {
    entity_type: string
    entity_id: string
    schema_type: string
    json_ld: string
  },
  token: string,
): Promise<{ id: string; ok: boolean }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/seo/schema`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `seo_schema_upsert_${res.status}`)
  }
  return json(res)
}

export type UrlRedirect = {
  id: string
  from_path: string
  to_path: string
  status_code: number
  locale_id: string | null
}

export async function listSeoRedirects(token: string): Promise<{ redirects: UrlRedirect[] }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/seo/redirects`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(`seo_redirects_${res.status}`)
  return json(res)
}

export async function createSeoRedirect(
  token: string,
  body: {
    from_path: string
    to_path: string
    status_code?: number
    organization_id?: string
    locale?: string
  },
): Promise<{ id: string }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/seo/redirects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `seo_redirect_create_${res.status}`)
  }
  return json(res)
}

export async function deleteSeoRedirect(token: string, id: string): Promise<{ ok: boolean }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/seo/redirects/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `seo_redirect_delete_${res.status}`)
  }
  return json(res)
}

export type SeoNotFoundLogRow = {
  id: string
  path: string
  locale_id: string | null
  hit_count: string
  last_seen: string
}

export async function listSeoNotFoundLogs(token: string): Promise<{ logs: SeoNotFoundLogRow[] }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/seo/not-found/logs`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(`seo_not_found_logs_${res.status}`)
  return json(res)
}

/** 404 günlüğü (kimlik doğrulama yok; hata yutulabilir). */
export async function logSeoNotFound(body: { path: string; locale?: string }): Promise<{ ok: boolean }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/seo/not-found`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      path: body.path,
      ...(body.locale?.trim() ? { locale: body.locale.trim() } : {}),
    }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `seo_not_found_log_${res.status}`)
  }
  return json(res)
}

export type SitemapEntry = {
  kind: string
  slug: string
  organization_id: string
  /** `product_categories.code` — yalnızca `kind === 'listing'` */
  category_code?: string | null
}

export async function getSeoSitemapEntries(): Promise<{ entries: SitemapEntry[] }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/seo/sitemap`)
  if (!res.ok) throw new Error(`seo_sitemap_${res.status}`)
  return json(res)
}

/** Aynı kayıtların sitemap.org XML çıktısı (ilan: `/otel|/tur|…/slug`, `/p/…`, `/blog/…`). */
export async function getSeoSitemapXml(): Promise<string> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/seo/sitemap.xml`)
  if (!res.ok) throw new Error(`seo_sitemap_xml_${res.status}`)
  return res.text()
}

// --- CMS (sayfalar, bloklar, curated filtre) ---

export type CmsPage = {
  id: string
  organization_id: string | null
  slug: string
  template_code: string
  is_published: boolean
  created_at: string
}

export type CmsBlock = {
  id: string
  sort_order: number
  block_type: string
  /** JSON string; `JSON.parse` ile obje */
  config_json: string
}

export async function listCmsPages(
  token: string,
  params?: {
    organization_id?: string
    published_only?: boolean
  },
): Promise<{ pages: CmsPage[] }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const q = new URLSearchParams()
  if (params?.organization_id != null && params.organization_id !== '')
    q.set('organization_id', params.organization_id)
  if (params?.published_only != null) q.set('published_only', String(params.published_only))
  const res = await fetch(`${b}/api/v1/cms/pages${q.toString() ? `?${q}` : ''}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(`cms_pages_${res.status}`)
  return json(res)
}

export async function createCmsPage(
  token: string,
  body: {
    slug: string
    organization_id?: string
    template_code?: string
    is_published?: boolean
  },
): Promise<{ id: string }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/cms/pages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `cms_page_create_${res.status}`)
  }
  return json(res)
}

export async function getCmsPage(token: string, pageId: string): Promise<{ page: CmsPage }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/cms/pages/${encodeURIComponent(pageId)}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(`cms_page_${res.status}`)
  return json(res)
}

export async function getCmsPageBySlug(params: {
  slug: string
  /** Boş: yalnızca `organization_id` null olan sayfa */
  organization_id?: string
}): Promise<{ page: CmsPage; blocks: CmsBlock[] }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const q = new URLSearchParams({ slug: params.slug })
  if (params.organization_id != null) q.set('organization_id', params.organization_id)
  const res = await fetch(`${b}/api/v1/cms/pages/by-slug?${q}`)
  if (!res.ok) throw new Error(`cms_page_by_slug_${res.status}`)
  const data = (await json(res)) as { page: CmsPage; blocks?: CmsBlock[] }
  return { page: data.page, blocks: Array.isArray(data.blocks) ? data.blocks : [] }
}

export async function patchCmsPage(
  token: string,
  pageId: string,
  body: { slug?: string; template_code?: string; is_published?: boolean },
): Promise<{ id: string; ok: boolean }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/cms/pages/${encodeURIComponent(pageId)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `cms_page_patch_${res.status}`)
  }
  return json(res)
}

export async function listCmsBlocks(
  token: string,
  pageId: string,
): Promise<{ blocks: CmsBlock[] }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/cms/pages/${encodeURIComponent(pageId)}/blocks`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(`cms_blocks_${res.status}`)
  return json(res)
}

export async function addCmsBlock(
  token: string,
  pageId: string,
  body: { block_type: string; sort_order?: number; config_json: string },
): Promise<{ id: string }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/cms/pages/${encodeURIComponent(pageId)}/blocks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `cms_block_add_${res.status}`)
  }
  return json(res)
}

export async function patchCmsBlock(
  token: string,
  pageId: string,
  blockId: string,
  body: { block_type?: string; sort_order?: number; config_json?: string },
): Promise<{ id: string; ok: boolean }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(
    `${b}/api/v1/cms/pages/${encodeURIComponent(pageId)}/blocks/${encodeURIComponent(blockId)}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    },
  )
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `cms_block_patch_${res.status}`)
  }
  return json(res)
}

export async function deleteCmsBlock(
  token: string,
  pageId: string,
  blockId: string,
): Promise<{ ok: boolean }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(
    `${b}/api/v1/cms/pages/${encodeURIComponent(pageId)}/blocks/${encodeURIComponent(blockId)}`,
    { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } },
  )
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `cms_block_delete_${res.status}`)
  }
  return json(res)
}

export async function reorderCmsBlocks(
  token: string,
  pageId: string,
  orderedBlockIds: string[],
): Promise<{ ok: boolean }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(
    `${b}/api/v1/cms/pages/${encodeURIComponent(pageId)}/blocks/reorder`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ ordered_block_ids: orderedBlockIds }),
    },
  )
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `cms_blocks_reorder_${res.status}`)
  }
  return json(res)
}

export async function getCmsCuratedFilter(
  token: string,
  pageId: string,
): Promise<{ filter_json: string | null }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/cms/pages/${encodeURIComponent(pageId)}/curated-filter`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(`cms_curated_get_${res.status}`)
  return json(res)
}

export async function putCmsCuratedFilter(
  token: string,
  pageId: string,
  body: { filter_json: string },
): Promise<{ id: string; ok: boolean }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/cms/pages/${encodeURIComponent(pageId)}/curated-filter`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `cms_curated_put_${res.status}`)
  }
  return json(res)
}

// --- Blog (kategoriler, yazılar, çeviriler) ---

export type BlogCategory = {
  id: string
  slug: string
  parent_id: string | null
  name: string | null
  description: string | null
  image_url: string | null
  meta_title: string | null
  sort_order: number
  is_active: boolean
}

export async function listBlogCategories(): Promise<{ categories: BlogCategory[] }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/blog/categories`)
  if (!res.ok) throw new Error(`blog_categories_${res.status}`)
  return json(res)
}

export async function createBlogCategory(
  token: string,
  body: {
    slug: string
    parent_id?: string
    name?: string
  },
): Promise<{ id: string }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/blog/categories`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `blog_category_create_${res.status}`)
  }
  return json(res)
}

export type BlogPost = {
  id: string
  category_id: string | null
  slug: string
  author_user_id: string | null
  published_at: string | null
  created_at: string
  featured_image_url: string | null
  hero_gallery_json: string
  tags_json: string
  read_time_minutes: string | null
  title: string | null
}

export async function listBlogPosts(params?: {
  category_id?: string
  published_only?: boolean
  limit?: number
  /** Yönetici: taslakları da görmek için oturum jetonu. */
  token?: string
}): Promise<{ posts: BlogPost[] }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const q = new URLSearchParams()
  if (params?.category_id != null && params.category_id !== '')
    q.set('category_id', params.category_id)
  if (params?.published_only != null) q.set('published_only', String(params.published_only))
  if (params?.limit != null) q.set('limit', String(params.limit))
  const headers: HeadersInit = {}
  if (params?.token) headers.Authorization = `Bearer ${params.token}`
  const res = await fetch(`${b}/api/v1/blog/posts${q.toString() ? `?${q}` : ''}`, { headers })
  if (!res.ok) throw new Error(`blog_posts_${res.status}`)
  return json(res)
}

export async function createBlogPost(
  token: string,
  body: {
    slug: string
    category_id?: string
    author_user_id?: string
  },
): Promise<{ id: string }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/blog/posts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `blog_post_create_${res.status}`)
  }
  return json(res)
}

export async function getBlogPost(token: string, postId: string): Promise<{ post: BlogPost }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/blog/posts/${encodeURIComponent(postId)}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(`blog_post_${res.status}`)
  return json(res)
}

export type BlogTranslationPublic = {
  locale: string
  title: string
  body: string
  excerpt: string | null
}

export async function getBlogPostBySlug(
  slug: string,
  locale?: string,
): Promise<{ post: BlogPost; translation: BlogTranslationPublic | null }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const q = new URLSearchParams({ slug })
  if (locale != null && locale.trim() !== '') q.set('locale', locale.trim())
  const res = await fetch(`${b}/api/v1/blog/posts/by-slug?${q}`)
  if (!res.ok) throw new Error(`blog_post_by_slug_${res.status}`)
  return json(res)
}

export async function patchBlogPost(
  token: string,
  postId: string,
  body: { slug?: string; category_id?: string; published_at?: string },
): Promise<{ id: string; ok: boolean }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/blog/posts/${encodeURIComponent(postId)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `blog_post_patch_${res.status}`)
  }
  return json(res)
}

export type BlogTranslation = {
  locale: string
  title: string
  body: string
  excerpt: string | null
}

export async function listBlogTranslations(
  token: string,
  postId: string,
): Promise<{ translations: BlogTranslation[] }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/blog/posts/${encodeURIComponent(postId)}/translations`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(`blog_translations_${res.status}`)
  return json(res)
}

export async function upsertBlogTranslation(
  token: string,
  postId: string,
  body: { locale: string; title: string; body?: string; excerpt?: string },
): Promise<{ ok: boolean }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/blog/posts/${encodeURIComponent(postId)}/translations`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `blog_translation_upsert_${res.status}`)
  }
  return json(res)
}

export async function putBlogPostMeta(
  token: string,
  postId: string,
  body: {
    featured_image_url?: string | null
    hero_gallery_json?: string
    read_time_minutes?: number | null
    tags_json?: string
    meta_title?: string | null
    meta_description?: string | null
  },
): Promise<{ ok: boolean }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/blog/posts/${encodeURIComponent(postId)}/meta`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `blog_post_meta_${res.status}`)
  }
  return json(res)
}

export async function deleteBlogPost(token: string, postId: string): Promise<{ ok: boolean }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/blog/posts/${encodeURIComponent(postId)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `blog_post_delete_${res.status}`)
  }
  return json(res)
}

export async function patchBlogCategory(
  token: string,
  categoryId: string,
  body: {
    slug?: string
    name?: string | null
    description?: string | null
    image_url?: string | null
    meta_title?: string | null
    meta_description?: string | null
    sort_order?: number
    is_active?: boolean
  },
): Promise<{ ok: boolean }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/blog/categories/${encodeURIComponent(categoryId)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `blog_category_patch_${res.status}`)
  }
  return json(res)
}

// --- Çok dilli URL (localized_routes) ---

export type LocalizedRoute = {
  id: string
  locale: string
  logical_key: string
  path_segment: string
}

export async function listLocalizedRoutes(locale?: string): Promise<{ routes: LocalizedRoute[] }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const q = locale != null && locale !== '' ? `?locale=${encodeURIComponent(locale)}` : ''
  const res = await fetch(`${b}/api/v1/i18n/localized-routes${q}`)
  if (!res.ok) throw new Error(`localized_routes_${res.status}`)
  return json(res)
}

export async function upsertLocalizedRoute(
  token: string,
  body: {
    locale: string
    logical_key: string
    path_segment: string
  },
): Promise<{ id: string; ok: boolean }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/i18n/localized-routes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `localized_route_upsert_${res.status}`)
  }
  return json(res)
}

export async function patchLocalizedRoute(
  token: string,
  routeId: string,
  body: { logical_key?: string; path_segment?: string },
): Promise<{ id: string; ok: boolean }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/i18n/localized-routes/${encodeURIComponent(routeId)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `localized_route_patch_${res.status}`)
  }
  return json(res)
}

export async function deleteLocalizedRoute(
  token: string,
  routeId: string,
): Promise<{ ok: boolean }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/i18n/localized-routes/${encodeURIComponent(routeId)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `localized_route_delete_${res.status}`)
  }
  return json(res)
}

// --- Pazarlama (kupon, kampanya, çapraz satış) ---

export type Coupon = {
  id: string
  code: string
  name?: string
  description?: string
  name_translations?: string
  description_translations?: string
  discount_type: string
  discount_value: string
  max_uses: string | null
  used_count: string
  valid_from: string | null
  valid_to: string | null
  is_public?: boolean
  created_at: string
}

export async function listCoupons(token: string): Promise<{ coupons: Coupon[] }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/marketing/coupons`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(`marketing_coupons_${res.status}`)
  return json(res)
}

export async function createCoupon(
  token: string,
  body: {
    code: string
    discount_type: 'percent' | 'fixed'
    discount_value: string
    max_uses?: number
    valid_from?: string
    valid_to?: string
    name?: string
    description?: string
    name_translations?: string
    description_translations?: string
    is_public?: boolean
  },
): Promise<{ id: string }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/marketing/coupons`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `marketing_coupon_create_${res.status}`)
  }
  return json(res)
}

export async function patchCoupon(
  token: string,
  couponId: string,
  body: {
    code?: string
    discount_type?: string
    discount_value?: string
    max_uses?: number
    valid_from?: string
    valid_to?: string
    name?: string
    description?: string
    name_translations?: string
    description_translations?: string
    is_public?: boolean
  },
): Promise<{ id: string; ok: boolean }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/marketing/coupons/${encodeURIComponent(couponId)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `marketing_coupon_patch_${res.status}`)
  }
  return json(res)
}

export type CouponLimits = {
  min_order_amount: string
  allowed_category_codes: string
}

export async function getCouponLimits(
  token: string,
  couponId: string,
): Promise<CouponLimits> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(
    `${b}/api/v1/marketing/coupons/${encodeURIComponent(couponId)}/limits`,
    { headers: { Authorization: `Bearer ${token}` } },
  )
  if (!res.ok) throw new Error(`coupon_limits_get_${res.status}`)
  return json(res)
}

export async function patchCouponLimits(
  token: string,
  couponId: string,
  body: { min_order_amount?: string; allowed_category_codes?: string },
): Promise<{ id: string; ok: boolean }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(
    `${b}/api/v1/marketing/coupons/${encodeURIComponent(couponId)}/limits`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    },
  )
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `coupon_limits_patch_${res.status}`)
  }
  return json(res)
}

export async function deleteCoupon(token: string, couponId: string): Promise<{ ok: boolean }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/marketing/coupons/${encodeURIComponent(couponId)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `marketing_coupon_delete_${res.status}`)
  }
  return json(res)
}

export type Campaign = {
  id: string
  code: string
  campaign_type: string
  name: string
  /** Çoklu dil isim haritası — JSONB string ham gelir; `parseNameTranslations` ile çöz */
  name_translations?: string
  rules_json: string
  starts_at: string | null
  ends_at: string | null
  is_active: boolean
}

/**
 * Backend `name_translations` alanını JSONB metin olarak gönderir;
 * `{ "tr": "Yaz", "en": "Summer", ... }` haritasına dönüştürür.
 */
export function parseNameTranslations(raw: string | undefined | null): Record<string, string> {
  if (!raw) return {}
  try {
    const v = JSON.parse(raw) as unknown
    if (!v || typeof v !== 'object' || Array.isArray(v)) return {}
    const out: Record<string, string> = {}
    for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
      if (typeof k === 'string' && typeof val === 'string') out[k] = val
    }
    return out
  } catch {
    return {}
  }
}

/** Aktif locale'e göre çevrilmiş isim, yoksa varsayılan TR `name` */
export function pickLocalizedName(
  defaultName: string,
  rawTranslations: string | undefined | null,
  locale: string,
): string {
  const map = parseNameTranslations(rawTranslations)
  const lc = locale.toLowerCase()
  const fromLocale = map[lc]?.trim()
  if (fromLocale) return fromLocale
  const fromTr = map.tr?.trim()
  if (fromTr) return fromTr
  return defaultName
}

export async function listCampaigns(token: string): Promise<{ campaigns: Campaign[] }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/marketing/campaigns`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(`marketing_campaigns_${res.status}`)
  return json(res)
}

export async function createCampaign(
  token: string,
  body: {
    code: string
    campaign_type: string
    name: string
    /** JSONB string: '{"tr":"...","en":"..."}'. Boşsa "{}" varsayılır. */
    name_translations?: string
    rules_json?: string
    starts_at?: string
    ends_at?: string
    is_active?: boolean
  },
): Promise<{ id: string }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/marketing/campaigns`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `marketing_campaign_create_${res.status}`)
  }
  return json(res)
}

export async function patchCampaign(
  token: string,
  campaignId: string,
  body: {
    code?: string
    name?: string
    /** JSONB string: '{"tr":"...","en":"..."}'. Mevcut değeri korumak için bırakın. */
    name_translations?: string
    rules_json?: string
    starts_at?: string
    ends_at?: string
    is_active?: boolean
  },
): Promise<{ id: string; ok: boolean }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/marketing/campaigns/${encodeURIComponent(campaignId)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `marketing_campaign_patch_${res.status}`)
  }
  return json(res)
}

export async function deleteCampaign(token: string, campaignId: string): Promise<{ ok: boolean }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/marketing/campaigns/${encodeURIComponent(campaignId)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `marketing_campaign_delete_${res.status}`)
  }
  return json(res)
}

export type HolidayPackage = {
  id: string
  name: string
  /** Çoklu dil isim haritası — JSONB string ham gelir; `parseNameTranslations` ile çöz */
  name_translations?: string
  bundle_json: string
  organization_id: string | null
  created_at: string
}

/** Tarayıcıda Next vekil rotası; sunucuda doğrudan Gleam. */
function holidayPackagesUrl(packageId?: string): string {
  const tail = packageId ? `/${encodeURIComponent(packageId)}` : ''
  if (typeof window !== 'undefined') {
    return `/api/v1/marketing/holiday-packages${tail}`
  }
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  return `${b}/api/v1/marketing/holiday-packages${tail}`
}

function holidayHeaders(token: string, jsonBody: boolean): HeadersInit {
  const h: Record<string, string> = { Authorization: `Bearer ${token}` }
  if (jsonBody) h['Content-Type'] = 'application/json'
  return h
}

export async function listHolidayPackages(token: string): Promise<{ packages: HolidayPackage[] }> {
  const res = await fetch(holidayPackagesUrl(), {
    headers: holidayHeaders(token, false),
    credentials: 'include',
    cache: 'no-store',
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    const hint =
      res.status === 404
        ? 'Paket tatil listesi bulunamadı. Gleam backend’i güncel kodla derleyip yeniden başlatın veya NEXT_PUBLIC_API_URL’i kontrol edin.'
        : (err as { error?: string }).error
    throw new Error(hint ?? `marketing_holiday_packages_${res.status}`)
  }
  return json(res)
}

export async function createHolidayPackage(
  token: string,
  body: { name: string; name_translations?: string; bundle_json?: string },
): Promise<{ id: string }> {
  const res = await fetch(holidayPackagesUrl(), {
    method: 'POST',
    headers: holidayHeaders(token, true),
    body: JSON.stringify(body),
    credentials: 'include',
    cache: 'no-store',
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `marketing_holiday_package_create_${res.status}`)
  }
  return json(res)
}

export async function patchHolidayPackage(
  token: string,
  packageId: string,
  body: { name?: string; name_translations?: string; bundle_json?: string },
): Promise<{ id: string; ok: boolean }> {
  const res = await fetch(holidayPackagesUrl(packageId), {
    method: 'PATCH',
    headers: holidayHeaders(token, true),
    body: JSON.stringify(body),
    credentials: 'include',
    cache: 'no-store',
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `marketing_holiday_package_patch_${res.status}`)
  }
  return json(res)
}

export async function deleteHolidayPackage(token: string, packageId: string): Promise<{ ok: boolean }> {
  const res = await fetch(holidayPackagesUrl(packageId), {
    method: 'DELETE',
    headers: holidayHeaders(token, false),
    credentials: 'include',
    cache: 'no-store',
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `marketing_holiday_package_delete_${res.status}`)
  }
  return json(res)
}

export type CrossSellRule = {
  id: string
  trigger_category_code: string
  offer_category_code: string
  message_key: string | null
  discount_percent: string | null
  priority: string
}

export async function listCrossSellRules(token: string): Promise<{ rules: CrossSellRule[] }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/marketing/cross-sell-rules`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(`marketing_cross_sell_${res.status}`)
  return json(res)
}

/** Önyüz — tetikleyen kategoriye göre teklifler (uçak→konaklama, konaklama→uçak, …). */
export async function fetchPublicCrossSellSuggestions(
  triggerCategory: string,
): Promise<{ rules: CrossSellRule[] }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const q = new URLSearchParams()
  q.set('trigger_category', triggerCategory)
  const res = await fetch(
    `${b}/api/v1/marketing/public/cross-sell-suggestions?${q.toString()}`,
  )
  if (!res.ok) throw new Error(`marketing_public_cross_sell_${res.status}`)
  return json(res)
}

export async function createCrossSellRule(
  token: string,
  body: {
    trigger_category_code: string
    offer_category_code: string
    message_key?: string
    discount_percent?: string
    priority?: number
  },
): Promise<{ id: string }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/marketing/cross-sell-rules`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `marketing_cross_sell_create_${res.status}`)
  }
  return json(res)
}

// --- Mesajlaşma kataloğu (şablon, tetikleyici, iş kuyruğu) ---

export type EmailTemplate = {
  id: string
  code: string
  subject_key: string
  body_key: string
}

export async function listEmailTemplates(token: string): Promise<{ templates: EmailTemplate[] }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/messaging/email-templates`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(`messaging_email_templates_${res.status}`)
  return json(res)
}

export type NotificationTrigger = {
  id: string
  code: string
  description: string
}

export async function listNotificationTriggers(
  token: string,
): Promise<{ triggers: NotificationTrigger[] }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/messaging/triggers`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(`messaging_triggers_${res.status}`)
  return json(res)
}

export type NotificationJob = {
  id: string
  trigger_id: string
  user_id: string | null
  channel: string
  payload_json: string
  scheduled_at: string
  sent_at: string | null
  status: string
}

export async function listNotificationJobs(
  token: string,
  params?: {
    status?: string
    limit?: number
  },
): Promise<{ jobs: NotificationJob[] }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const q = new URLSearchParams()
  if (params?.status) q.set('status', params.status)
  if (params?.limit != null) q.set('limit', String(params.limit))
  const res = await fetch(`${b}/api/v1/messaging/jobs${q.toString() ? `?${q}` : ''}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(`messaging_jobs_${res.status}`)
  return json(res)
}

export async function queueNotificationJob(
  token: string,
  body: {
    trigger_code: string
    user_id?: string
    channel: 'sms' | 'email' | 'whatsapp'
    payload_json: string
    scheduled_at: string
  },
): Promise<{ id: string }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/messaging/jobs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `messaging_job_queue_${res.status}`)
  }
  return json(res)
}

// --- Site ayarları (site_settings) + ön yüz public-config ---

export type SiteSettingRow = {
  id: string
  organization_id: string | null
  key: string
  /** JSON string */
  value_json: string
}

/** scope: all | platform | tenant (tenant için organization_id zorunlu) — `admin.users.read` */
export async function listSiteSettings(
  token: string,
  params?: {
    scope?: 'all' | 'platform' | 'tenant'
    organization_id?: string
    key?: string
  },
): Promise<{ settings: SiteSettingRow[] }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const q = new URLSearchParams()
  if (params?.scope) q.set('scope', params.scope)
  if (params?.organization_id != null) q.set('organization_id', params.organization_id)
  if (params?.key) q.set('key', params.key)
  const res = await fetch(`${b}/api/v1/site/settings${q.toString() ? `?${q}` : ''}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(`site_settings_${res.status}`)
  return json(res)
}

export async function upsertSiteSetting(
  token: string,
  body: {
    organization_id?: string
    key: string
    value_json: string
  },
): Promise<{ id: string; ok: boolean }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/site/settings`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `site_settings_upsert_${res.status}`)
  }
  return json(res)
}

/** Yönetim paneli — HttpOnly cookie; localStorage token gerekmez. */
export async function fetchSiteSettingsFromPanel(params?: {
  scope?: 'all' | 'platform' | 'tenant'
  organization_id?: string
  key?: string
}): Promise<{ settings: SiteSettingRow[] }> {
  const q = new URLSearchParams()
  if (params?.scope) q.set('scope', params.scope)
  if (params?.organization_id != null) q.set('organization_id', params.organization_id)
  if (params?.key) q.set('key', params.key)
  const res = await fetch(`/api/manage/site-settings${q.toString() ? `?${q}` : ''}`, {
    credentials: 'include',
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`site_settings_${res.status}`)
  return json(res)
}

/** Yönetim paneli — HttpOnly cookie; localStorage token gerekmez. */
export async function upsertSiteSettingFromPanel(body: {
  organization_id?: string
  key: string
  value_json: string
}): Promise<{ id: string; ok: boolean }> {
  const res = await fetch('/api/manage/site-settings', {
    method: 'PUT',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `site_settings_upsert_${res.status}`)
  }
  return json(res)
}

/** organization_id boş: yalnızca platform (organization_id null) satırı — `admin.users.read` */
export async function deleteSiteSetting(
  token: string,
  params: {
    key: string
    organization_id?: string
  },
): Promise<{ ok: boolean }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const q = new URLSearchParams({ key: params.key })
  if (params.organization_id != null && params.organization_id !== '')
    q.set('organization_id', params.organization_id)
  const res = await fetch(`${b}/api/v1/site/settings?${q}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `site_settings_delete_${res.status}`)
  }
  return json(res)
}

export type SitePublicConfig = {
  analytics: Record<string, unknown> | null
  maps: Record<string, unknown> | null
  ui: Record<string, unknown> | null
  branding: Record<string, unknown> | null
  /** GET public-config — site_settings.mega_menu */
  mega_menu?: unknown
  /** GET public-config — site_settings.catalog_menu (header Katalog açılır menü) */
  catalog_menu?: unknown
  /** GET public-config — mega menü sağ görsel kartı */
  mega_menu_sidebar?: unknown
}

/** GET /api/v1/currency/currencies — yönetici panelinde tanımlı para birimleri */
export type PublicCurrencyRow = {
  code: string
  name: string
  symbol: string
  decimal_places: number
  is_active: boolean
  sort_order?: number
}

export async function getPublicCurrencies(init?: RequestInit): Promise<PublicCurrencyRow[]> {
  const b = base()
  if (!b) return []
  const res = await fetch(`${b}/api/v1/currency/currencies`, init)
  if (!res.ok) return []
  const data = (await json(res)) as { currencies?: PublicCurrencyRow[] }
  return Array.isArray(data.currencies) ? data.currencies : []
}

export type PublicCurrencyRateRow = {
  base_code: string
  quote_code: string
  rate: number
  source: string
  fetched_at: string
}

/** GET /api/v1/currency/rates — vitrin fiyat dönüşümü (herkese açık) */
export async function getPublicCurrencyRates(init?: RequestInit): Promise<PublicCurrencyRateRow[]> {
  const b = base()
  if (!b) return []
  try {
    const res = await fetch(`${b}/api/v1/currency/rates`, init)
    if (!res.ok) return []
    const data = (await json(res)) as { rates?: PublicCurrencyRateRow[] }
    return Array.isArray(data.rates) ? data.rates : []
  } catch {
    return []
  }
}

/** GET /api/v1/catalog/public/category-stats — yayımlanan ilan sayısını kategoriye göre döner */
export async function getPublicCategoryStats(init?: RequestInit): Promise<Record<string, number>> {
  const b = base()
  if (!b) return {}
  try {
    const res = await fetch(`${b}/api/v1/catalog/public/category-stats`, init)
    if (!res.ok) return {}
    const data = (await json(res)) as { stats?: Record<string, number> }
    return data.stats && typeof data.stats === 'object' ? data.stats : {}
  } catch {
    return {}
  }
}

export type CruiseHubStatsRow = {
  cruise_line: string
  route_summary: string
  category_link: string
  count: number
  night_count: number
}

/** GET /api/v1/catalog/public/cruise-hub-stats — kruvaziyer hub kart istatistikleri */
export async function getPublicCruiseHubStats(init?: RequestInit): Promise<CruiseHubStatsRow[]> {
  const b = base()
  if (!b) return []
  try {
    const res = await fetch(`${b}/api/v1/catalog/public/cruise-hub-stats`, init)
    if (!res.ok) return []
    const data = (await json(res)) as {
      rows?: Array<{
        cruise_line?: string
        route_summary?: string
        category_link?: string
        night_count?: number
        count?: number
      }>
    }
    if (!Array.isArray(data.rows)) return []
    return data.rows
      .map((row) => ({
        cruise_line: String(row.cruise_line ?? ''),
        route_summary: String(row.route_summary ?? ''),
        category_link: String(row.category_link ?? ''),
        night_count: typeof row.night_count === 'number' ? row.night_count : 0,
        count: typeof row.count === 'number' ? row.count : 0,
      }))
      .filter((row) => row.count > 0)
  } catch {
    return []
  }
}

export type TourKulturHubStatsRow = {
  tour_region: string
  count: number
}

/** GET /api/v1/catalog/public/tour-kultur-hub-stats — kültür tur hub kart istatistikleri */
export async function getPublicTourKulturHubStats(init?: RequestInit): Promise<TourKulturHubStatsRow[]> {
  const b = base()
  if (!b) return []
  try {
    const res = await fetch(`${b}/api/v1/catalog/public/tour-kultur-hub-stats`, init)
    if (!res.ok) return []
    const data = (await json(res)) as {
      rows?: Array<{ tour_region?: string; count?: number }>
    }
    if (!Array.isArray(data.rows)) return []
    return data.rows
      .map((row) => ({
        tour_region: String(row.tour_region ?? ''),
        count: typeof row.count === 'number' ? row.count : 0,
      }))
      .filter((row) => row.count > 0 && row.tour_region)
  } catch {
    return []
  }
}

/** Bölge slider'ı (SectionSliderRegions) — backend henüz yoksa veya hata varsa [] */
export type PublicRegionStatItem = {
  name: string
  slug: string
  count: number
  thumbnail: string
}

export type PublicRegionStatsOpts = {
  /** Tatil evi alt kategori: villa | apart | daire | bungalov — ilçe sayıları buna göre filtrelenir */
  propertyType?: string
}

/**
 * GET /api/v1/catalog/public/region-stats?category_code=&limit=&property_type=
 * Kategoriye göre yayımlı ilan sayısı (konaklama → TR ilçeleri; tour → destinasyonlar).
 */
export async function getPublicRegionStats(
  categoryCode: string,
  limit: number,
  init?: RequestInit,
  opts?: PublicRegionStatsOpts,
): Promise<PublicRegionStatItem[]> {
  const b = base()
  if (!b) return []
  try {
    const q = new URLSearchParams()
    q.set('category_code', categoryCode)
    q.set('limit', String(limit))
    if (opts?.propertyType?.trim()) q.set('property_type', opts.propertyType.trim())
    const res = await fetch(`${b}/api/v1/catalog/public/region-stats?${q}`, init)
    if (!res.ok) return []
    const data = (await json(res)) as {
      regions?: Array<Partial<PublicRegionStatItem>>
    }
    if (!Array.isArray(data.regions)) return []
    return data.regions
      .filter((r): r is PublicRegionStatItem =>
        typeof r?.slug === 'string' &&
        r.slug !== '' &&
        typeof r?.name === 'string',
      )
      .map((r) => ({
        name: r.name,
        slug: r.slug,
        count: typeof r.count === 'number' && Number.isFinite(r.count) ? r.count : 0,
        thumbnail: typeof r.thumbnail === 'string' ? r.thumbnail : '',
      }))
  } catch {
    return []
  }
}

export async function getSitePublicConfig(
  organizationId?: string,
  init?: RequestInit,
): Promise<SitePublicConfig> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const q = new URLSearchParams()
  if (organizationId != null && organizationId !== '') q.set('organization_id', organizationId)
  const res = await fetch(`${b}/api/v1/site/public-config${q.toString() ? `?${q}` : ''}`, init)
  if (!res.ok) throw new Error(`site_public_config_${res.status}`)
  return json(res)
}

/** Otel detay — galeri altı kampanya kartları (`catalog.hotel_valid_campaigns`). */
async function fetchHotelValidCampaignsFromOrigin(
  origin: string,
  init?: RequestInit,
): Promise<HotelValidCampaignsPayload> {
  const res = await fetch(`${origin.replace(/\/$/, '')}/api/v1/catalog/public/hotel-valid-campaigns`, init)
  if (!res.ok) return parseHotelValidCampaignsPayload({ items: [] })
  const raw: unknown = await json(res)
  return parseHotelValidCampaignsPayload(raw)
}

export async function fetchPublicHotelValidCampaigns(
  init?: RequestInit,
): Promise<HotelValidCampaignsPayload> {
  const b = base()
  if (!b) {
    return parseHotelValidCampaignsPayload({ items: [] })
  }
  try {
    const primary = await fetchHotelValidCampaignsFromOrigin(b, init)
    if (primary.items.length > 0) return primary

    const localDev = 'http://127.0.0.1:8080'
    if (
      process.env.NODE_ENV === 'development' &&
      b.replace(/\/$/, '') !== localDev
    ) {
      try {
        const local = await fetchHotelValidCampaignsFromOrigin(localDev, init)
        if (local.items.length > 0) return local
      } catch {
        /* yerel API kapalı */
      }
    }

    return primary
  } catch {
    return parseHotelValidCampaignsPayload({ items: [] })
  }
}

/** Tatil evi vitrin SSS şablonu — kimlik doğrulama gerekmez. */
export async function fetchPublicHolidayHomeFaqTemplate(
  init?: RequestInit,
): Promise<HolidayHomeFaqTemplatePayload> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/catalog/public/holiday-home-faq-template`, init)
  if (!res.ok) throw new Error(`holiday_home_faq_template_${res.status}`)
  const raw: unknown = await json(res)
  return withHolidayHomeFaqTemplateDefaults(parseHolidayHomeFaqTemplatePayload(raw))
}

/** `catalog.holiday_home_property_types` — kimlik gerekmez (ilan sahibi + admin aynı liste). */
export async function fetchPublicHolidayHomePropertyTypes(
  init?: RequestInit,
): Promise<HolidayHomePropertyTypeItem[]> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/catalog/public/holiday-home-property-types`, init)
  if (!res.ok) return []
  try {
    const raw: unknown = await json(res)
    return parseHolidayHomePropertyTypesPayload(raw)
  } catch {
    return []
  }
}

/** Yat kiralama vitrin SSS şablonu — kimlik doğrulama gerekmez. */
export async function fetchPublicYachtCharterFaqTemplate(
  init?: RequestInit,
): Promise<HolidayHomeFaqTemplatePayload> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/catalog/public/yacht-charter-faq-template`, init)
  if (!res.ok) throw new Error(`yacht_charter_faq_template_${res.status}`)
  const raw: unknown = await json(res)
  return withHolidayHomeFaqTemplateDefaults(parseHolidayHomeFaqTemplatePayload(raw))
}

/** `catalog.yacht_charter_property_types` — kimlik gerekmez. */
export async function fetchPublicYachtCharterPropertyTypes(
  init?: RequestInit,
): Promise<HolidayHomePropertyTypeItem[]> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/catalog/public/yacht-charter-property-types`, init)
  if (!res.ok) return []
  try {
    const raw: unknown = await json(res)
    return parseHolidayHomePropertyTypesPayload(raw)
  } catch {
    return []
  }
}

// --- Navigasyon (menü, anasayfa bölümleri, popup) — 130_navigation_ui ---

export type NavMenu = {
  id: string
  organization_id: string | null
  code: string
}

export async function listNavMenus(organizationId?: string): Promise<{ menus: NavMenu[] }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const q = new URLSearchParams()
  if (organizationId != null && organizationId !== '') q.set('organization_id', organizationId)
  const res = await fetch(`${b}/api/v1/navigation/menus${q.toString() ? `?${q}` : ''}`)
  if (!res.ok) throw new Error(`navigation_menus_${res.status}`)
  return json(res)
}

export async function createNavMenu(
  token: string,
  body: {
    code: string
    organization_id?: string
  },
): Promise<{ id: string }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/navigation/menus`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `navigation_menu_create_${res.status}`)
  }
  return json(res)
}

export type NavMenuItem = {
  id: string
  parent_id: string | null
  sort_order: number
  label_key: string
  url: string | null
  mega_content_json: string
  /** Eski API yanıtlarında eksik olabilir — önyüzde true varsayın */
  is_published?: boolean
}

/** Anasayfa / önyüz — kimlik doğrulama yok; yalnızca yayında öğeler. */
export async function fetchPublicNavMenuItems(
  menuCode: string,
  organizationId?: string,
  init?: RequestInit,
): Promise<{ items: NavMenuItem[] }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const q = new URLSearchParams()
  if (organizationId != null && organizationId !== '') q.set('organization_id', organizationId)
  const res = await fetch(
    `${b}/api/v1/navigation/public/menus/${encodeURIComponent(menuCode)}/items${q.toString() ? `?${q}` : ''}`,
    init,
  )
  if (!res.ok) throw new Error(`navigation_public_menu_items_${res.status}`)
  return json(res)
}

export async function listNavMenuItems(menuId: string): Promise<{ items: NavMenuItem[] }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/navigation/menus/${encodeURIComponent(menuId)}/items`)
  if (!res.ok) throw new Error(`navigation_menu_items_${res.status}`)
  return json(res)
}

export async function addNavMenuItem(
  token: string,
  menuId: string,
  body: {
    label_key: string
    parent_id?: string
    sort_order?: number
    url?: string
    mega_content_json?: string
    is_published?: boolean
  },
): Promise<{ id: string }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/navigation/menus/${encodeURIComponent(menuId)}/items`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `navigation_menu_item_add_${res.status}`)
  }
  return json(res)
}

export async function patchNavMenuItem(
  token: string,
  menuId: string,
  itemId: string,
  body: {
    sort_order?: number
    label_key?: string
    url?: string
    mega_content_json?: string
    is_published?: boolean
    /** Boş string = kök (üst yok). */
    parent_id?: string
  },
): Promise<{ id: string; ok: boolean }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(
    `${b}/api/v1/navigation/menus/${encodeURIComponent(menuId)}/items/${encodeURIComponent(itemId)}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    },
  )
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `navigation_menu_item_patch_${res.status}`)
  }
  return json(res)
}

export async function deleteNavMenuItem(
  token: string,
  menuId: string,
  itemId: string,
): Promise<{ ok: boolean }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(
    `${b}/api/v1/navigation/menus/${encodeURIComponent(menuId)}/items/${encodeURIComponent(itemId)}`,
    { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } },
  )
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `navigation_menu_item_delete_${res.status}`)
  }
  return json(res)
}

export type HomeLayoutSection = {
  id: string
  organization_id: string | null
  section_type: string
  sort_order: string
  config_json: string
}

export async function listHomeLayoutSections(
  organizationId?: string,
): Promise<{ sections: HomeLayoutSection[] }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const q = new URLSearchParams()
  if (organizationId != null && organizationId !== '') q.set('organization_id', organizationId)
  const res = await fetch(`${b}/api/v1/navigation/home-sections${q.toString() ? `?${q}` : ''}`)
  if (!res.ok) throw new Error(`navigation_home_sections_${res.status}`)
  return json(res)
}

export async function createHomeLayoutSection(
  token: string,
  body: {
    organization_id?: string
    section_type: string
    sort_order: number
    config_json?: string
  },
): Promise<{ id: string }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/navigation/home-sections`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `navigation_home_section_create_${res.status}`)
  }
  return json(res)
}

export async function patchHomeLayoutSection(
  token: string,
  sectionId: string,
  body: { section_type?: string; sort_order?: number; config_json?: string },
): Promise<{ id: string; ok: boolean }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(
    `${b}/api/v1/navigation/home-sections/${encodeURIComponent(sectionId)}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    },
  )
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `navigation_home_section_patch_${res.status}`)
  }
  return json(res)
}

export async function deleteHomeLayoutSection(
  token: string,
  sectionId: string,
): Promise<{ ok: boolean }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/navigation/home-sections/${encodeURIComponent(sectionId)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `navigation_home_section_delete_${res.status}`)
  }
  return json(res)
}

export type SitePopup = {
  id: string
  organization_id: string | null
  popup_type: string
  rules_json: string
  content_key: string
  active: boolean
}

export async function listSitePopups(organizationId?: string): Promise<{ popups: SitePopup[] }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const q = new URLSearchParams()
  if (organizationId != null && organizationId !== '') q.set('organization_id', organizationId)
  const res = await fetch(`${b}/api/v1/navigation/popups${q.toString() ? `?${q}` : ''}`)
  if (!res.ok) throw new Error(`navigation_popups_${res.status}`)
  return json(res)
}

export async function createSitePopup(
  token: string,
  body: {
    organization_id?: string
    popup_type: string
    content_key: string
    rules_json?: string
    active?: boolean
  },
): Promise<{ id: string }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/navigation/popups`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `navigation_popup_create_${res.status}`)
  }
  return json(res)
}

export async function patchSitePopup(
  token: string,
  popupId: string,
  body: { popup_type?: string; rules_json?: string; content_key?: string; active?: boolean },
): Promise<{ id: string; ok: boolean }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/navigation/popups/${encodeURIComponent(popupId)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `navigation_popup_patch_${res.status}`)
  }
  return json(res)
}

export async function deleteSitePopup(token: string, popupId: string): Promise<{ ok: boolean }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/navigation/popups/${encodeURIComponent(popupId)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `navigation_popup_delete_${res.status}`)
  }
  return json(res)
}

// --- Engagement (140) — Bearer; misafir için X-Session-Key veya ?session_key= ---

function engagementHeaders(token?: string, sessionKey?: string, jsonBody?: boolean): HeadersInit {
  const h: Record<string, string> = {}
  if (jsonBody) h['Content-Type'] = 'application/json'
  if (token) h.Authorization = `Bearer ${token}`
  if (sessionKey) h['X-Session-Key'] = sessionKey
  return h
}

export type EngagementFavorite = {
  listing_id: string
  created_at: string
  slug: string
  status: string
}

export async function listEngagementFavorites(token: string): Promise<{ favorites: EngagementFavorite[] }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/engagement/favorites`, {
    headers: engagementHeaders(token),
  })
  if (!res.ok) throw new Error(`engagement_favorites_${res.status}`)
  return json(res)
}

export async function addEngagementFavorite(
  token: string,
  body: { listing_id: string },
): Promise<{ ok: boolean }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/engagement/favorites`, {
    method: 'POST',
    headers: engagementHeaders(token, undefined, true),
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `engagement_favorite_add_${res.status}`)
  }
  return json(res)
}

export async function removeEngagementFavorite(
  token: string,
  listingId: string,
): Promise<{ ok: boolean }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/engagement/favorites/${encodeURIComponent(listingId)}`, {
    method: 'DELETE',
    headers: engagementHeaders(token),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `engagement_favorite_remove_${res.status}`)
  }
  return json(res)
}

export type RecentlyViewedItem = {
  listing_id: string
  viewed_at: string
  slug: string
  status: string
}

export async function listRecentlyViewed(opts?: {
  token?: string
  sessionKey?: string
}): Promise<{ items: RecentlyViewedItem[] }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const q = new URLSearchParams()
  if (opts?.sessionKey) q.set('session_key', opts.sessionKey)
  const res = await fetch(
    `${b}/api/v1/engagement/recently-viewed${q.toString() ? `?${q}` : ''}`,
    { headers: engagementHeaders(opts?.token, opts?.sessionKey) },
  )
  if (!res.ok) throw new Error(`engagement_recent_${res.status}`)
  return json(res)
}

export async function addRecentlyViewed(
  body: { listing_id: string; session_key?: string },
  opts?: { token?: string; sessionKey?: string },
): Promise<{ ok: boolean }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/engagement/recently-viewed`, {
    method: 'POST',
    headers: engagementHeaders(opts?.token, opts?.sessionKey, true),
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `engagement_recent_add_${res.status}`)
  }
  return json(res)
}

export type ComparisonSetSummary = { id: string; criteria_json: string; created_at: string }

export async function listComparisonSets(opts?: {
  token?: string
  sessionKey?: string
}): Promise<{ sets: ComparisonSetSummary[] }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const q = new URLSearchParams()
  if (opts?.sessionKey) q.set('session_key', opts.sessionKey)
  const res = await fetch(
    `${b}/api/v1/engagement/comparison-sets${q.toString() ? `?${q}` : ''}`,
    { headers: engagementHeaders(opts?.token, opts?.sessionKey) },
  )
  if (!res.ok) throw new Error(`engagement_comparison_sets_${res.status}`)
  return json(res)
}

export async function createComparisonSet(
  body: { criteria_json?: string; session_key?: string },
  opts?: { token?: string; sessionKey?: string },
): Promise<{ id: string }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/engagement/comparison-sets`, {
    method: 'POST',
    headers: engagementHeaders(opts?.token, opts?.sessionKey, true),
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `engagement_comparison_create_${res.status}`)
  }
  return json(res)
}

export async function deleteComparisonSet(
  setId: string,
  opts?: { token?: string; sessionKey?: string },
): Promise<{ ok: boolean }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/engagement/comparison-sets/${encodeURIComponent(setId)}`, {
    method: 'DELETE',
    headers: engagementHeaders(opts?.token, opts?.sessionKey),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `engagement_comparison_delete_${res.status}`)
  }
  return json(res)
}

export type ComparisonListingItem = {
  listing_id: string
  slug: string
  status: string
}

export async function listComparisonItems(
  setId: string,
  opts?: { token?: string; sessionKey?: string },
): Promise<{ items: ComparisonListingItem[] }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(
    `${b}/api/v1/engagement/comparison-sets/${encodeURIComponent(setId)}/items`,
    { headers: engagementHeaders(opts?.token, opts?.sessionKey) },
  )
  if (!res.ok) throw new Error(`engagement_comparison_items_${res.status}`)
  return json(res)
}

export async function addComparisonItem(
  setId: string,
  body: { listing_id: string },
  opts?: { token?: string; sessionKey?: string },
): Promise<{ ok: boolean }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(
    `${b}/api/v1/engagement/comparison-sets/${encodeURIComponent(setId)}/items`,
    {
      method: 'POST',
      headers: engagementHeaders(opts?.token, opts?.sessionKey, true),
      body: JSON.stringify(body),
    },
  )
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `engagement_comparison_item_add_${res.status}`)
  }
  return json(res)
}

export async function removeComparisonItem(
  setId: string,
  listingId: string,
  opts?: { token?: string; sessionKey?: string },
): Promise<{ ok: boolean }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(
    `${b}/api/v1/engagement/comparison-sets/${encodeURIComponent(setId)}/items/${encodeURIComponent(listingId)}`,
    { method: 'DELETE', headers: engagementHeaders(opts?.token, opts?.sessionKey) },
  )
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `engagement_comparison_item_remove_${res.status}`)
  }
  return json(res)
}

export async function logVoiceSearch(
  body: { transcript: string; resolved_query_json?: string },
  opts?: { token?: string },
): Promise<{ ok: boolean }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/engagement/voice-search-log`, {
    method: 'POST',
    headers: engagementHeaders(opts?.token, undefined, true),
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `engagement_voice_log_${res.status}`)
  }
  return json(res)
}

// --- Yorumlar (120) ---

export type Review = {
  id: string
  entity_type: string
  entity_id: string
  user_id: string | null
  rating: number
  title: string | null
  body: string | null
  status: string
  has_verified_purchase: boolean
  photo_keys: string
  created_at: string
}

export interface PublicReview {
  id: string
  reviewer_name: string
  rating: number
  title: string | null
  body: string | null
  created_at: string
}

/** Bir kategoriye ait ilanların onaylı yorumlarını döndürür (public). */
export async function getPublicReviewsByCategory(
  slug: string,
  limit = 6,
  init?: RequestInit,
): Promise<PublicReview[]> {
  const b = base()
  if (!b) return []
  try {
    const q = new URLSearchParams({ slug, limit: String(limit) })
    const res = await fetch(`${b}/api/v1/reviews/public/by-category?${q}`, init)
    if (!res.ok) return []
    const data = (await json(res)) as { reviews?: PublicReview[] }
    return Array.isArray(data.reviews) ? data.reviews : []
  } catch {
    return []
  }
}

export async function listReviews(params: {
  entity_type: string
  entity_id: string
}): Promise<{ reviews: Review[] }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const q = new URLSearchParams({
    entity_type: params.entity_type,
    entity_id: params.entity_id,
  })
  const res = await fetch(`${b}/api/v1/reviews?${q}`)
  if (!res.ok) throw new Error(`reviews_list_${res.status}`)
  return json(res)
}

export async function createReview(
  body: {
    entity_type: string
    entity_id: string
    rating: number
    title?: string
    body?: string
    has_verified_purchase?: boolean
    photo_keys?: string[]
  },
  token?: string,
): Promise<{ id: string }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/reviews`, {
    method: 'POST',
    headers: engagementHeaders(token, undefined, true),
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `reviews_create_${res.status}`)
  }
  return json(res)
}

export async function listMyReviews(token: string): Promise<{ reviews: Review[] }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/reviews/mine`, { headers: engagementHeaders(token) })
  if (!res.ok) throw new Error(`reviews_mine_${res.status}`)
  return json(res)
}

/** Yönetici — tüm durumlar. `GET /api/v1/reviews/admin` */
export async function listReviewsAdmin(
  token: string,
  params?: { status?: 'pending' | 'approved' | 'rejected' | 'hidden' | 'all'; limit?: number },
): Promise<{ reviews: Review[] }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const q = new URLSearchParams()
  if (params?.status) q.set('status', params.status)
  if (params?.limit != null) q.set('limit', String(params.limit))
  const res = await fetch(`${b}/api/v1/reviews/admin${q.toString() ? `?${q}` : ''}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    const code = (err as { error?: string }).error
    if (res.status === 404) {
      throw new Error(
        code ??
          'Yorum yönetimi API bulunamadı (404). Backend’i son kodla derleyip yeniden başlatın (gleam build); NEXT_PUBLIC_API_URL kök olmalı (örn. http://127.0.0.1:8080, /api/v1 eklemeyin).',
      )
    }
    throw new Error(code ?? `reviews_admin_${res.status}`)
  }
  return json(res)
}

/** Yönetici — durum güncelle. `PATCH /api/v1/reviews/:id/moderation` */
export async function patchReviewModeration(
  token: string,
  reviewId: string,
  body: { status: 'approved' | 'rejected' | 'hidden' },
): Promise<{ id: string; ok: boolean; status: string }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/reviews/${encodeURIComponent(reviewId)}/moderation`, {
    method: 'PATCH',
    headers: engagementHeaders(token, undefined, true),
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `reviews_moderation_${res.status}`)
  }
  return json(res)
}

export async function patchReview(
  token: string,
  reviewId: string,
  body: { title?: string; body?: string; rating?: number; photo_keys?: string[] },
): Promise<{ id: string; ok: boolean }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/reviews/${encodeURIComponent(reviewId)}`, {
    method: 'PATCH',
    headers: engagementHeaders(token, undefined, true),
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `reviews_patch_${res.status}`)
  }
  return json(res)
}

export type ExternalReviewSnapshot = {
  id: string
  source: string
  entity_type: string
  entity_id: string
  snapshot_json: string
  ai_summary: string | null
  fetched_at: string
}

export async function listExternalReviewSnapshots(params: {
  entity_type: string
  entity_id: string
}): Promise<{ snapshots: ExternalReviewSnapshot[] }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const q = new URLSearchParams({
    entity_type: params.entity_type,
    entity_id: params.entity_id,
  })
  const res = await fetch(`${b}/api/v1/reviews/external-snapshots?${q}`)
  if (!res.ok) throw new Error(`reviews_external_list_${res.status}`)
  return json(res)
}

export async function createExternalReviewSnapshot(body: {
  source: string
  entity_type: string
  entity_id: string
  snapshot_json: string
  ai_summary?: string
}): Promise<{ id: string }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/reviews/external-snapshots`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `reviews_external_create_${res.status}`)
  }
  return json(res)
}

// --- Lokasyon & iCal (110) ---

const locJson = (): HeadersInit => ({ 'Content-Type': 'application/json' })

async function rejectUnlessOkLocations(res: Response, statusFallbackPrefix: string): Promise<void> {
  if (res.ok) return
  const parsed = (await res.clone().json().catch(() => ({}))) as { error?: string }
  const code = parsed.error?.trim()
  throw new Error(code && code !== '' ? code : `${statusFallbackPrefix}_${res.status}`)
}

export type LocationCountry = { id: string; iso2: string; name: string }

export async function listLocationCountries(): Promise<{ countries: LocationCountry[] }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/locations/countries`, { credentials: 'include' })
  if (!res.ok) throw new Error(`locations_countries_${res.status}`)
  return json(res)
}

export async function createLocationCountry(body: {
  iso2: string
  name: string
}): Promise<{ id: string }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/locations/countries`, {
    method: 'POST',
    headers: locJson(),
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `locations_country_create_${res.status}`)
  }
  return json(res)
}

export type LocationRegion = {
  id: string
  country_id: string
  name: string
  slug: string
  center_lat: string | null
  center_lng: string | null
  /** GET /locations/regions — bağlı ilçe sayısı */
  district_count?: number
}

export async function listLocationRegions(countryId: string): Promise<{ regions: LocationRegion[] }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const q = new URLSearchParams({ country_id: countryId })
  const res = await fetch(`${b}/api/v1/locations/regions?${q}`, { credentials: 'include' })
  await rejectUnlessOkLocations(res, 'locations_regions')
  return json(res)
}

export async function createLocationRegion(body: {
  country_id: string
  name: string
  slug: string
  center_lat?: string
  center_lng?: string
}): Promise<{ id: string }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/locations/regions`, {
    method: 'POST',
    headers: locJson(),
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `locations_region_create_${res.status}`)
  }
  return json(res)
}

export type LocationDistrict = {
  id: string
  region_id: string
  name: string
  slug: string
  center_lat: string | null
  center_lng: string | null
}

/** `GET districts/lookup` — panelde il/ülke zincirini kurmak için (country_id dahil). */
export type LocationDistrictLookupDetail = LocationDistrict & { country_id: string }

export async function lookupLocationDistrict(
  districtId: string,
): Promise<{ district: LocationDistrictLookupDetail }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const raw = `${districtId}`.trim()
  if (!raw) throw new Error('district_id_missing')
  const q = new URLSearchParams({ id: raw })
  const res = await fetch(`${b}/api/v1/locations/districts/lookup?${q}`, { credentials: 'include' })
  await rejectUnlessOkLocations(res, 'locations_district_lookup')
  return json(res)
}

export async function listLocationDistricts(regionId: string): Promise<{ districts: LocationDistrict[] }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const q = new URLSearchParams({ region_id: regionId })
  const res = await fetch(`${b}/api/v1/locations/districts?${q}`, { credentials: 'include' })
  await rejectUnlessOkLocations(res, 'locations_districts')
  return json(res)
}

/** İlçe altında yayınlanmış belde / destination `location_pages` (boş olabilir). */
export type LocationDestinationChild = {
  slug_path: string
  title: string | null
  featured_image_url: string | null
  hero_image_url: string | null
}

export async function listLocationDestinationChildren(
  parentSlugPath: string,
): Promise<{ items: LocationDestinationChild[] }> {
  const b = base()
  if (!b) return { items: [] }
  const q = new URLSearchParams({ parent_slug_path: parentSlugPath })
  try {
    const res = await fetch(`${b}/api/v1/locations/pages/destination-children?${q}`, {
      next: { revalidate: 120 },
    })
    if (!res.ok) return { items: [] }
    return json(res)
  } catch {
    return { items: [] }
  }
}

export async function createLocationDistrict(body: {
  region_id: string
  name: string
  slug: string
  center_lat?: string
  center_lng?: string
}): Promise<{ id: string }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/locations/districts`, {
    method: 'POST',
    headers: locJson(),
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `locations_district_create_${res.status}`)
  }
  return json(res)
}

export type LocationPage = {
  id: string
  district_id: string | null
  slug_path: string
  hero_image_key: string | null
  created_at: string
  title: string | null
  description: string | null
  meta_title: string | null
  meta_description: string | null
  gallery_json: string
  map_lat: string | null
  map_lng: string | null
  /** İlçe tablosundan; `map_lat` boşsa yönetim haritası buna düşer */
  district_center_lat?: string | null
  district_center_lng?: string | null
  /** `regions` tablosu — il (`province`) sayfaları veya ilçe üzerinden il merkezi */
  region_center_lat?: string | null
  region_center_lng?: string | null
  /** Ülke / il seçicilerini doldurmak için (`regions.country_id`, bağlı il kimliği) */
  parent_country_id?: string | null
  parent_region_id?: string | null
  map_zoom: number
  is_published: boolean
  region_type: 'country' | 'province' | 'district' | 'destination'
  featured_image_url: string | null
  hero_image_url: string | null
  travel_ideas_image_url: string | null
  cover_image?: string | null
  travel_ideas_json: string
  /** AI gezi rotaları — günlük kara programı JSON dizisi */
  trip_routes_json?: string
  /** AI mavi yolculuk rotaları — gulet/yat deniz programı */
  blue_cruise_routes_json?: string
  translations_json: string
  poi_manual_json: string
  country_info_json: string
  /** Gezi fikirleri altı 3 sütun mekan/mesafe — JSON veya API nesnesi */
  nearby_vitrin_columns_json?: unknown
  /** İlçe servis POI (market, havalimanı …) — vitrin yakın mekanlar */
  service_pois_json?: unknown
}

export type TravelIdea = {
  id: string | number
  image?: string
  /** Kısa rozet (ör. AI çıktısı — vitrinde soldaki renkli etiket) */
  tag?: string
  title: string
  link?: string
  summary: string
  /** POI koordinatları (Google Maps'ten çekildiğinde dolu gelir) */
  lat?: number
  lng?: number
  place_id?: string
  /** İlçe merkezinden mesafe (Google Maps çekme sırasında hesaplanır) */
  distance_km_from_district?: number
  /** Bazı kayıtlarda tek mesafe alanı (km) */
  distance_km?: number
  /** İlandan mesafe (ilana koordinat girilince hesaplanır) */
  distance_km_from_listing?: number
}

export type ManualPoi = {
  id: string
  category: string
  name: string
  distance_km: number
  lat?: number | null
  lng?: number | null
}

/** `location_pages.service_pois_json` okuma — panel ve vitrin türevi */
export function parseDistrictServicePoisJson(raw: unknown): DistrictServicePoi[] {
  if (raw == null) return []
  if (Array.isArray(raw)) return raw as DistrictServicePoi[]
  if (typeof raw === 'string') {
    const s = raw.trim()
    if (!s) return []
    try {
      const p = JSON.parse(s) as unknown
      return Array.isArray(p) ? (p as DistrictServicePoi[]) : []
    } catch {
      return []
    }
  }
  return []
}

export type LocationTranslations = {
  [locale: string]: { name?: string; description?: string; meta_title?: string; meta_description?: string }
}

export type LocationPagePatch = {
  district_id?: string
  slug_path?: string
  hero_image_key?: string
  title?: string
  description?: string
  meta_title?: string
  meta_description?: string
  gallery_json?: string
  map_lat?: string
  map_lng?: string
  map_zoom?: number
  is_published?: boolean
  region_type?: string
  featured_image_url?: string
  hero_image_url?: string
  travel_ideas_image_url?: string
  travel_ideas_json?: string
  translations_json?: string
  poi_manual_json?: string
  country_info_json?: string
  nearby_vitrin_columns_json?: string
  /** Gezilecek / temel / ulaşım vitrin POI kayıtları */
  service_pois_json?: string
}

export type ListLocationPagesResult = {
  pages: LocationPage[]
  total: number
  limit: number
  offset: number
}

export async function listLocationPages(opts?: {
  districtId?: string
  limit?: number
  offset?: number
  q?: string
}): Promise<ListLocationPagesResult> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const q = new URLSearchParams()
  if (opts?.districtId != null && opts.districtId !== '') q.set('district_id', opts.districtId)
  if (opts?.limit != null) q.set('limit', String(opts.limit))
  if (opts?.offset != null && opts.offset !== 0) q.set('offset', String(opts.offset))
  if (opts?.q != null && opts.q.trim() !== '') q.set('q', opts.q.trim())
  const res = await fetch(`${b}/api/v1/locations/pages${q.toString() ? `?${q}` : ''}`)
  if (!res.ok) throw new Error(`locations_pages_${res.status}`)
  return json(res)
}

/** Ağ hatası / API kapalı — `null` (sayfa çökmez; bölge vitrinı yine render olur). */
export async function getLocationPageBySlug(slugPath: string): Promise<LocationPage | null> {
  const b = base()
  if (!b) return null
  try {
    const q = new URLSearchParams({ slug_path: slugPath })
    const res = await fetch(`${b}/api/v1/locations/pages/by-slug?${q}`, {
      /** Yönetimden gelen `map_lat`/`map_lng` vitrinla aynı kaynaktan okunmalı; kısa önbellek pin sapması yaratıyordu. */
      cache: 'no-store',
    })
    if (res.status === 204) return null
    if (!res.ok) return null
    return json(res)
  } catch {
    return null
  }
}

/** Bölge adı veya slug parçasına göre location page arar (ilan sayfaları için) */
export async function getLocationPageByName(name: string): Promise<LocationPage | null> {
  const b = base()
  if (!b) return null
  try {
    const q = new URLSearchParams({ name })
    const res = await fetch(`${b}/api/v1/locations/pages/by-name?${q}`)
    if (res.status === 204) return null
    if (!res.ok) return null
    return json(res)
  } catch {
    return null
  }
}

export async function getLocationPage(pageId: string): Promise<LocationPage> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/locations/pages/${encodeURIComponent(pageId)}`, {
    credentials: 'include',
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`locations_page_${res.status}`)
  return json(res)
}

export async function createLocationPage(body: {
  slug_path: string
  district_id?: string
  hero_image_key?: string
  title?: string
  map_lat?: string | number
  map_lng?: string | number
  map_zoom?: number
}): Promise<{ id: string }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/locations/pages`, {
    method: 'POST',
    headers: locJson(),
    body: JSON.stringify(body),
    credentials: 'include',
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `locations_page_create_${res.status}`)
  }
  return json(res)
}

export async function patchLocationPage(
  pageId: string,
  body: LocationPagePatch,
): Promise<{ id: string; ok: boolean }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/locations/pages/${encodeURIComponent(pageId)}`, {
    method: 'PATCH',
    headers: locJson(),
    body: JSON.stringify(body),
    credentials: 'include',
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `locations_page_patch_${res.status}`)
  }
  return json(res)
}

export async function deleteLocationPage(pageId: string): Promise<{ ok: boolean }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/locations/pages/${encodeURIComponent(pageId)}`, {
    method: 'DELETE',
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `locations_page_delete_${res.status}`)
  }
  return json(res)
}

export type LocationPoiSettings = {
  id: string
  poi_types: string
  max_per_type: number
  radius_meters: number
}

export async function getLocationPoiSettings(pageId: string): Promise<LocationPoiSettings> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(
    `${b}/api/v1/locations/pages/${encodeURIComponent(pageId)}/poi-settings`,
  )
  if (!res.ok) throw new Error(`locations_poi_settings_${res.status}`)
  return json(res)
}

export async function putLocationPoiSettings(
  pageId: string,
  body: { poi_types: string[]; max_per_type: number; radius_meters: number },
): Promise<{ id: string; ok: boolean }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(
    `${b}/api/v1/locations/pages/${encodeURIComponent(pageId)}/poi-settings`,
    {
      method: 'PUT',
      headers: locJson(),
      body: JSON.stringify(body),
    },
  )
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `locations_poi_settings_put_${res.status}`)
  }
  return json(res)
}

export type LocationPoiCacheItem = {
  id: string
  place_id: string | null
  name: string
  poi_type: string
  distance_meters: string | null
  lat: string | null
  lng: string | null
}

export async function listLocationPoiCache(pageId: string): Promise<{ items: LocationPoiCacheItem[] }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(
    `${b}/api/v1/locations/pages/${encodeURIComponent(pageId)}/poi-cache`,
  )
  if (!res.ok) throw new Error(`locations_poi_cache_${res.status}`)
  return json(res)
}

export async function addLocationPoiCacheRow(
  pageId: string,
  body: {
    name: string
    poi_type: string
    place_id?: string
    distance_meters?: number
    lat?: string
    lng?: string
  },
): Promise<{ id: string }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(
    `${b}/api/v1/locations/pages/${encodeURIComponent(pageId)}/poi-cache`,
    {
      method: 'POST',
      headers: locJson(),
      body: JSON.stringify(body),
    },
  )
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `locations_poi_cache_add_${res.status}`)
  }
  return json(res)
}

export async function clearLocationPoiCache(pageId: string): Promise<{ ok: boolean }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(
    `${b}/api/v1/locations/pages/${encodeURIComponent(pageId)}/poi-cache`,
    { method: 'DELETE' },
  )
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `locations_poi_cache_clear_${res.status}`)
  }
  return json(res)
}

export type IcalFeed = {
  id: string
  listing_id: string
  url: string
  day_offset_plus: number
  day_offset_minus: number
  last_sync_at: string | null
  last_hash: string | null
  /** Son sync hatası; null = başarılı veya henüz sync edilmedi. */
  last_error?: string | null
  /** Son sync'te içe aktarılan VEVENT sayısı. */
  last_event_count?: number
  /** false ise sync atlanır (UI'da kapatma toggle'ı için). */
  is_active?: boolean
}

/**
 * Manuel iCal sync — verilen feed'in URL'sinden takvimi çekip
 * `listing_availability_calendar`'ı günceller.
 */
export async function syncIcalFeed(
  feedId: string,
): Promise<{ ok: true; event_count: number; day_count: number }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(
    `${b}/api/v1/locations/ical-feeds/${encodeURIComponent(feedId)}/sync`,
    { method: 'POST', headers: locJson() },
  )
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(
      (err as { error?: string }).error ?? `locations_ical_sync_${res.status}`,
    )
  }
  return json(res)
}

/**
 * iCal feed'inden içe aktarılan ham blok kayıtları (debug + denetim).
 *
 * Backend `feed_id` veya `listing_id`'den birini ister. Her sync feed'i
 * idempotent yeniden yazar (önce silip sonra ekler) → bu uçtaki kayıtlar her
 * zaman feed'in son halini yansıtır.
 */
export type IcalImportedBlock = {
  id: number
  feed_id: string
  listing_id: string
  uid: string
  starts_on: string
  ends_on: string
  summary: string
  imported_at: string
}

export async function listIcalImportedBlocks(params: {
  feed_id?: string
  listing_id?: string
  limit?: number
}): Promise<{ blocks: IcalImportedBlock[]; count: number }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const qs = new URLSearchParams()
  if (params.feed_id) qs.set('feed_id', params.feed_id)
  if (params.listing_id) qs.set('listing_id', params.listing_id)
  if (typeof params.limit === 'number') qs.set('limit', String(params.limit))
  const res = await fetch(
    `${b}/api/v1/locations/ical-imported-blocks?${qs.toString()}`,
  )
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(
      (err as { error?: string }).error ?? `ical_imported_blocks_${res.status}`,
    )
  }
  return json(res)
}

/**
 * iCal export token + public URL'i döner. Token yoksa otomatik üretir.
 * Aynı listing için her çağrıda aynı sonucu verir (idempotent).
 */
export async function getListingIcalExportToken(
  token: string,
  listingId: string,
  params?: { organizationId?: string },
): Promise<{ token: string; url: string }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const qs = catalogListingQs(params)
  const res = await fetch(
    `${b}/api/v1/catalog/listings/${encodeURIComponent(listingId)}/ical-export-token${qs}`,
    {
      headers: { ...locJson(), Authorization: `Bearer ${token}` },
    },
  )
  if (!res.ok) throw new Error(`ical_export_token_get_${res.status}`)
  return json(res)
}

/**
 * Mevcut export token'ı geçersizleştirip yenisini üretir.
 * Eski URL'i kullanan harici takvimler 404 alır → admin bilinçli rotation.
 */
export async function rotateListingIcalExportToken(
  token: string,
  listingId: string,
  params?: { organizationId?: string },
): Promise<{ token: string; url: string }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const qs = catalogListingQs(params)
  const res = await fetch(
    `${b}/api/v1/catalog/listings/${encodeURIComponent(listingId)}/ical-export-token${qs}`,
    {
      method: 'POST',
      headers: { ...locJson(), Authorization: `Bearer ${token}` },
    },
  )
  if (!res.ok) throw new Error(`ical_export_token_rotate_${res.status}`)
  return json(res)
}

export async function listIcalFeeds(listingId: string): Promise<{ feeds: IcalFeed[] }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const q = new URLSearchParams({ listing_id: listingId })
  const res = await fetch(`${b}/api/v1/locations/ical-feeds?${q}`)
  if (!res.ok) throw new Error(`locations_ical_list_${res.status}`)
  return json(res)
}

export async function createIcalFeed(body: {
  listing_id: string
  url: string
  day_offset_plus?: number
  day_offset_minus?: number
}): Promise<{ id: string }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/locations/ical-feeds`, {
    method: 'POST',
    headers: locJson(),
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `locations_ical_create_${res.status}`)
  }
  return json(res)
}

export async function patchIcalFeed(
  feedId: string,
  body: {
    url?: string
    day_offset_plus?: number
    day_offset_minus?: number
    last_sync_at?: string
    last_hash?: string
    /** false → sync atlanır (kullanıcı geçici durdurmak için) */
    is_active?: boolean
  },
): Promise<{ id: string; ok: boolean }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/locations/ical-feeds/${encodeURIComponent(feedId)}`, {
    method: 'PATCH',
    headers: locJson(),
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `locations_ical_patch_${res.status}`)
  }
  return json(res)
}

export async function deleteIcalFeed(feedId: string): Promise<{ ok: boolean }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/locations/ical-feeds/${encodeURIComponent(feedId)}`, {
    method: 'DELETE',
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `locations_ical_delete_${res.status}`)
  }
  return json(res)
}

// --- Canlı sohbet (150) & helpdesk kataloğu (152) ---

export type SupportChatChannel = { id: string; code: string; config_json: string }

export async function listSupportChatChannels(): Promise<{ channels: SupportChatChannel[] }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/support/chat/channels`)
  if (!res.ok) throw new Error(`support_chat_channels_${res.status}`)
  return json(res)
}

export async function createSupportChatSession(
  body: { channel_code: string; ai_mode?: string; locale?: string },
  token?: string,
): Promise<{ id: string }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/support/chat/sessions`, {
    method: 'POST',
    headers: engagementHeaders(token, undefined, true),
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `support_chat_session_create_${res.status}`)
  }
  return json(res)
}

export type SupportChatSession = {
  id: string
  user_id: string | null
  channel_id: string
  started_at: string
  closed_at: string | null
  ai_mode: string
  locale?: string
}

export async function listSupportChatSessions(token: string): Promise<{ sessions: SupportChatSession[] }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/support/chat/sessions`, {
    headers: engagementHeaders(token),
  })
  if (!res.ok) throw new Error(`support_chat_sessions_${res.status}`)
  return json(res)
}

export async function getSupportChatSession(sessionId: string): Promise<SupportChatSession> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/support/chat/sessions/${encodeURIComponent(sessionId)}`)
  if (!res.ok) throw new Error(`support_chat_session_${res.status}`)
  return json(res)
}

export async function closeSupportChatSession(
  sessionId: string,
): Promise<{ id: string; ok: boolean }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/support/chat/sessions/${encodeURIComponent(sessionId)}`, {
    method: 'PATCH',
    headers: locJson(),
    body: JSON.stringify({ close: true }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `support_chat_session_close_${res.status}`)
  }
  return json(res)
}

export type SupportChatMessage = {
  id: string
  role: string
  body: string
  meta_json: string
  created_at: string
}

export async function listSupportChatMessages(
  sessionId: string,
): Promise<{ messages: SupportChatMessage[] }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(
    `${b}/api/v1/support/chat/sessions/${encodeURIComponent(sessionId)}/messages`,
  )
  if (!res.ok) throw new Error(`support_chat_messages_${res.status}`)
  return json(res)
}

export async function postSupportChatMessage(
  sessionId: string,
  body: { body: string; meta_json?: string },
): Promise<{ id: string; assistant_message_id?: string | null }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(
    `${b}/api/v1/support/chat/sessions/${encodeURIComponent(sessionId)}/messages`,
    {
      method: 'POST',
      headers: locJson(),
      body: JSON.stringify(body),
    },
  )
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `support_chat_message_post_${res.status}`)
  }
  return json(res)
}

export type SupportChatFollowup = {
  id: string
  step: string
  scheduled_at: string
  sent_at: string | null
  payload_json: string
}

export async function listSupportChatFollowups(
  sessionId: string,
): Promise<{ followups: SupportChatFollowup[] }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(
    `${b}/api/v1/support/chat/sessions/${encodeURIComponent(sessionId)}/followups`,
  )
  if (!res.ok) throw new Error(`support_chat_followups_${res.status}`)
  return json(res)
}

export async function createSupportChatFollowup(
  sessionId: string,
  body: { step: number; scheduled_at: string; payload_json?: string },
): Promise<{ id: string }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(
    `${b}/api/v1/support/chat/sessions/${encodeURIComponent(sessionId)}/followups`,
    {
      method: 'POST',
      headers: locJson(),
      body: JSON.stringify(body),
    },
  )
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `support_chat_followup_create_${res.status}`)
  }
  return json(res)
}

export type SupportDepartment = {
  id: string
  code: string
  name_key: string
  sort_order: number
}

export async function listSupportDepartments(): Promise<{ departments: SupportDepartment[] }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/support/departments`)
  if (!res.ok) throw new Error(`support_departments_${res.status}`)
  return json(res)
}

export type SupportMacro = {
  id: string
  code: string
  title: string
  body: string
  department_id: string | null
}

export async function listSupportMacros(departmentId?: string): Promise<{ macros: SupportMacro[] }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const q = new URLSearchParams()
  if (departmentId != null && departmentId !== '') q.set('department_id', departmentId)
  const res = await fetch(`${b}/api/v1/support/macros${q.toString() ? `?${q}` : ''}`)
  if (!res.ok) throw new Error(`support_macros_${res.status}`)
  return json(res)
}

export type SupportSlaPolicy = {
  id: string
  department_id: string | null
  priority: string
  first_response_minutes: number
  resolve_minutes: number
}

export async function listSupportSlaPolicies(
  departmentId?: string,
): Promise<{ policies: SupportSlaPolicy[] }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const q = new URLSearchParams()
  if (departmentId != null && departmentId !== '') q.set('department_id', departmentId)
  const res = await fetch(`${b}/api/v1/support/sla-policies${q.toString() ? `?${q}` : ''}`)
  if (!res.ok) throw new Error(`support_sla_${res.status}`)
  return json(res)
}

export type SupportKbArticleListItem = {
  id: string
  slug: string
  department_id: string | null
  title: string
  body: string
}

export async function listSupportKbArticles(
  locale: string,
): Promise<{ articles: SupportKbArticleListItem[] }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const q = new URLSearchParams({ locale })
  const res = await fetch(`${b}/api/v1/support/kb/articles?${q}`)
  if (!res.ok) throw new Error(`support_kb_list_${res.status}`)
  return json(res)
}

export type SupportKbArticleDetail = {
  id: string
  slug: string
  locale: string
  title: string
  body: string
  created_at: string
}

export async function getSupportKbArticle(
  slug: string,
  locale: string,
): Promise<SupportKbArticleDetail> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const q = new URLSearchParams({ locale })
  const res = await fetch(
    `${b}/api/v1/support/kb/articles/${encodeURIComponent(slug)}?${q}`,
  )
  if (!res.ok) throw new Error(`support_kb_article_${res.status}`)
  return json(res)
}

// --- Entegrasyon meta (160) ---

export type IntegrationAccount = {
  id: string
  provider_code: string
  organization_id: string | null
  secret_configured: boolean
  is_active: string
  extra_json: string
}

export async function listIntegrationAccounts(
  token: string,
  organizationId?: string,
): Promise<{
  accounts: IntegrationAccount[]
}> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const q = new URLSearchParams()
  if (organizationId != null && organizationId !== '') q.set('organization_id', organizationId)
  const res = await fetch(`${b}/api/v1/integrations/accounts${q.toString() ? `?${q}` : ''}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(`integrations_accounts_${res.status}`)
  return json(res)
}

export async function createIntegrationAccount(
  token: string,
  body: {
    provider_code: string
    organization_id?: string
    config_secret_ref: string
    is_active?: boolean
    extra_json?: string
  },
): Promise<{ id: string }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/integrations/accounts`, {
    method: 'POST',
    headers: { ...locJson(), Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `integrations_account_create_${res.status}`)
  }
  return json(res)
}

export async function patchIntegrationAccount(
  token: string,
  accountId: string,
  body: { is_active?: boolean; extra_json?: string; config_secret_ref?: string },
): Promise<{ id: string; ok: boolean }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/integrations/accounts/${encodeURIComponent(accountId)}`, {
    method: 'PATCH',
    headers: { ...locJson(), Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `integrations_account_patch_${res.status}`)
  }
  return json(res)
}

export async function listIntegrationSyncLogs(
  token: string,
  integrationAccountId: string,
): Promise<{
  logs: { id: string; operation: string; status: string; detail_json: string; created_at: string }[]
}> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const q = new URLSearchParams({ integration_account_id: integrationAccountId })
  const res = await fetch(`${b}/api/v1/integrations/sync-logs?${q}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(`integrations_sync_logs_${res.status}`)
  return json(res)
}

export async function createIntegrationSyncLog(
  token: string,
  body: {
    integration_account_id: string
    operation: string
    status: string
    detail_json?: string
  },
): Promise<{ id: string }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/integrations/sync-logs`, {
    method: 'POST',
    headers: { ...locJson(), Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `integrations_sync_log_create_${res.status}`)
  }
  return json(res)
}

export async function listGoogleMerchantProducts(
  token: string,
  listingId: string,
): Promise<{
  products: {
    id: string
    listing_id: string
    merchant_product_id: string | null
    last_push_at: string | null
    status: string
  }[]
}> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const q = new URLSearchParams({ listing_id: listingId })
  const res = await fetch(`${b}/api/v1/integrations/google-merchant-products?${q}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(`integrations_gmp_${res.status}`)
  return json(res)
}

export async function createGoogleMerchantProduct(
  token: string,
  body: {
    listing_id: string
    merchant_product_id?: string
    status?: string
  },
): Promise<{ id: string }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/integrations/google-merchant-products`, {
    method: 'POST',
    headers: { ...locJson(), Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `integrations_gmp_create_${res.status}`)
  }
  return json(res)
}

export async function patchGoogleMerchantProduct(
  token: string,
  productId: string,
  body: {
    merchant_product_id?: string
    status?: string
    last_push_at?: string
  },
): Promise<{ id: string; ok: boolean }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(
    `${b}/api/v1/integrations/google-merchant-products/${encodeURIComponent(productId)}`,
    { method: 'PATCH', headers: { ...locJson(), Authorization: `Bearer ${token}` }, body: JSON.stringify(body) },
  )
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `integrations_gmp_patch_${res.status}`)
  }
  return json(res)
}

export type InstagramShopLink = {
  id: string
  listing_id: string
  instagram_media_id: string
  sync_enabled: boolean
}

export async function listInstagramShopLinks(
  listingId: string,
  token?: string,
): Promise<{ links: InstagramShopLink[] }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const q = new URLSearchParams({ listing_id: listingId })
  const res = await fetch(`${b}/api/v1/social/instagram-shop-links?${q}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  if (!res.ok) throw new Error(`instagram_shop_links_${res.status}`)
  return json(res)
}

export async function createInstagramShopLink(
  token: string,
  body: { listing_id: string; instagram_media_id: string; sync_enabled?: boolean },
): Promise<{ id: string }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/social/instagram-shop-links`, {
    method: 'POST',
    headers: { ...locJson(), Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `instagram_shop_create_${res.status}`)
  }
  return json(res)
}

export async function patchInstagramShopLink(
  token: string,
  linkId: string,
  body: { instagram_media_id?: string; sync_enabled?: boolean },
): Promise<{ id: string; ok: boolean }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(
    `${b}/api/v1/social/instagram-shop-links/${encodeURIComponent(linkId)}`,
    { method: 'PATCH', headers: { ...locJson(), Authorization: `Bearer ${token}` }, body: JSON.stringify(body) },
  )
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `instagram_shop_patch_${res.status}`)
  }
  return json(res)
}

export async function deleteInstagramShopLink(
  token: string,
  linkId: string,
): Promise<{ ok: boolean }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(
    `${b}/api/v1/social/instagram-shop-links/${encodeURIComponent(linkId)}`,
    { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } },
  )
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `instagram_shop_delete_${res.status}`)
  }
  return json(res)
}

export async function listWhatsappOrderIntents(
  token: string,
  limit?: number,
): Promise<{
  intents: {
    id: string
    phone: string
    cart_id: string | null
    payload_json: string
    created_at: string
  }[]
}> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const q = new URLSearchParams()
  if (limit != null) q.set('limit', String(limit))
  const res = await fetch(
    `${b}/api/v1/integrations/whatsapp-order-intents${q.toString() ? `?${q}` : ''}`,
    { headers: { Authorization: `Bearer ${token}` } },
  )
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `integrations_whatsapp_intents_${res.status}`)
  }
  return json(res)
}

export async function createWhatsappOrderIntent(body: {
  phone: string
  cart_id?: string
  payload_json?: string
}): Promise<{ id: string }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/integrations/whatsapp-order-intents`, {
    method: 'POST',
    headers: locJson(),
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `integrations_whatsapp_create_${res.status}`)
  }
  return json(res)
}

// --- AI (170) ---

export async function listAiProviders(token: string): Promise<{
  providers: {
    id: string
    code: string
    display_name: string
    default_model: string | null
    is_active: boolean
  }[]
}> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/ai/providers`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(`ai_providers_${res.status}`)
  return json(res)
}

export async function listAiFeatureProfiles(token: string): Promise<{
  profiles: {
    id: string
    code: string
    provider_id: string
    system_prompt: string | null
    temperature: string
  }[]
}> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/ai/feature-profiles`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(`ai_profiles_${res.status}`)
  return json(res)
}

export async function patchAiFeatureProfile(
  token: string,
  profileCode: string,
  body: { system_prompt: string; temperature: string },
): Promise<{ ok: boolean }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(
    `${b}/api/v1/ai/feature-profiles/${encodeURIComponent(profileCode)}`,
    {
      method: 'PATCH',
      headers: { ...locJson(), Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    },
  )
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `ai_profile_patch_${res.status}`)
  }
  return json(res)
}

export async function createAiJob(
  token: string,
  body: {
    profile_code: string
    input_json: string
    /** Varsayılan true — false ise yalnızca kuyruğa eklenir; sonra POST .../jobs/:id/run */
    run?: boolean
  },
): Promise<{ id: string }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/ai/jobs`, {
    method: 'POST',
    headers: { ...locJson(), Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `ai_job_create_${res.status}`)
  }
  return json(res)
}

/** Operasyon ajanı (müşteri sohbeti değil): provizyon / eskalasyon bağlamında öneri üretir. */
export async function runOpsAgent(
  token: string,
  body: { reservation_id: string; event_type?: string },
): Promise<{
  job: {
    id: string
    profile_code: string
    input_json: string
    output_json: string | null
    status: string
    error: string | null
    created_at: string
  }
}> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/ai/ops-agent/run`, {
    method: 'POST',
    headers: { ...locJson(), Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `ops_agent_${res.status}`)
  }
  return json(res)
}

export async function runAiJob(token: string, jobId: string): Promise<{ ok: boolean }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(
    `${b}/api/v1/ai/jobs/${encodeURIComponent(jobId)}/run`,
    { method: 'POST', headers: { Authorization: `Bearer ${token}` } },
  )
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `ai_job_run_${res.status}`)
  }
  return json(res)
}

export async function listAiJobs(
  token: string,
  status?: string,
): Promise<{
  jobs: {
    id: string
    profile_code: string
    input_json: string
    output_json: string | null
    status: string
    error: string | null
    created_at: string
  }[]
}> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const q = new URLSearchParams()
  if (status != null && status !== '') q.set('status', status)
  const res = await fetch(`${b}/api/v1/ai/jobs${q.toString() ? `?${q}` : ''}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(`ai_jobs_${res.status}`)
  return json(res)
}

export async function getAiJob(
  token: string,
  jobId: string,
): Promise<{
  id: string
  profile_code: string
  input_json: string
  output_json: string | null
  status: string
  error: string | null
  created_at: string
}> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/ai/jobs/${encodeURIComponent(jobId)}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(`ai_job_${res.status}`)
  return json(res)
}

export async function createAiRegionTask(
  token: string,
  body: {
    country_id?: string
    country_name: string
    step: string
    parent_region_id?: string
  },
): Promise<{ id: string }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/ai/region-tasks`, {
    method: 'POST',
    headers: { ...locJson(), Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `ai_region_task_${res.status}`)
  }
  return json(res)
}

/** Ülke için illeri DeepSeek ile üretir ve doğrudan `regions` tablosuna yazar (senkron). */
export async function generateAiProvincesSync(
  token: string,
  body: { country_name: string; country_id?: string },
): Promise<{ job_id: string; created: number; skipped: number }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/ai/region-tasks/generate-provinces`, {
    method: 'POST',
    headers: { ...locJson(), Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `ai_generate_provinces_${res.status}`)
  }
  return json(res)
}

/** İl için ilçeleri AI ile üretir (`districts` + ilçe `location_pages`). */
export async function generateAiDistrictsSync(
  token: string,
  body: { region_id: string },
): Promise<{ job_id: string; created: number; skipped: number }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/ai/region-tasks/generate-districts`, {
    method: 'POST',
    headers: { ...locJson(), Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `ai_generate_districts_${res.status}`)
  }
  return json(res)
}

/** İlçe için popüler destinasyonları AI ile üretir (`location_pages` destination). */
export async function generateAiDestinationsSync(
  token: string,
  body: { district_id: string },
): Promise<{ job_id: string; created: number; skipped: number }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/ai/region-tasks/generate-destinations`, {
    method: 'POST',
    headers: { ...locJson(), Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `ai_generate_destinations_${res.status}`)
  }
  return json(res)
}

export async function listAiRegionTasks(token: string): Promise<{ tasks: Record<string, unknown>[] }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/ai/region-tasks`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(`ai_region_tasks_${res.status}`)
  return json(res)
}

export async function createAiGeoBlogBatch(
  token: string,
  body: {
    location_page_id: string
    category_slug?: string
    posts_to_create?: number
  },
): Promise<{ id: string }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/ai/geo-blog-batches`, {
    method: 'POST',
    headers: { ...locJson(), Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `ai_geo_batch_${res.status}`)
  }
  return json(res)
}

export async function listAiGeoBlogBatches(
  token: string,
  locationPageId?: string,
): Promise<{
  batches: {
    id: string
    location_page_id: string
    category_slug: string
    posts_to_create: number
    job_id: string | null
    status: string
  }[]
}> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const q = new URLSearchParams()
  if (locationPageId != null && locationPageId !== '') q.set('location_page_id', locationPageId)
  const res = await fetch(`${b}/api/v1/ai/geo-blog-batches${q.toString() ? `?${q}` : ''}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(`ai_geo_batches_${res.status}`)
  return json(res)
}

export async function listAiPostBookingPlans(
  token: string,
  reservationId: string,
): Promise<{
  plans: {
    id: string
    reservation_id: string
    plan_json: string
    email_job_id: string | null
    created_at: string
  }[]
}> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const q = new URLSearchParams({ reservation_id: reservationId })
  const res = await fetch(`${b}/api/v1/ai/post-booking-plans?${q}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(`ai_post_booking_${res.status}`)
  return json(res)
}

// --- Dikey ilan detayları (180) — temel uçlar ---

const v = (listingId: string, path: string) =>
  `${(process.env.NEXT_PUBLIC_API_URL ?? '').replace(/\/$/, '')}/api/v1/verticals/listings/${encodeURIComponent(listingId)}${path}`

export async function getVerticalHolidayHome(listingId: string): Promise<{
  theme_codes: string
  rule_codes: string
  ical_managed: boolean
}> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(v(listingId, '/holiday-home'))
  if (!res.ok) throw new Error(`vertical_holiday_home_${res.status}`)
  return json(res)
}

export async function patchVerticalHolidayHome(
  listingId: string,
  body: { theme_codes?: string[]; rule_codes?: string[]; ical_managed?: boolean },
): Promise<{ listing_id: string; ok: boolean }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(v(listingId, '/holiday-home'), {
    method: 'PATCH',
    headers: locJson(),
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `vertical_holiday_home_patch_${res.status}`)
  }
  return json(res)
}

export async function getVerticalHolidayHomeBedrooms(
  listingId: string,
): Promise<{ bedrooms: ListingBedroomRow[] }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(v(listingId, '/holiday-home/bedrooms'))
  if (!res.ok) throw new Error(`vertical_holiday_home_bedrooms_${res.status}`)
  return json(res)
}

export async function putVerticalHolidayHomeBedrooms(
  listingId: string,
  bedrooms: {
    name: string
    floor_label?: string
    beds_description: string
    sort_order?: number
    ensuite?: boolean
  }[],
): Promise<{ ok: boolean }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(v(listingId, '/holiday-home/bedrooms'), {
    method: 'PUT',
    headers: locJson(),
    body: JSON.stringify({ bedrooms }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `vertical_holiday_home_bedrooms_put_${res.status}`)
  }
  return json(res)
}

export async function getVerticalYacht(listingId: string): Promise<Record<string, string>> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(v(listingId, '/yacht'))
  if (!res.ok) throw new Error(`vertical_yacht_${res.status}`)
  return json(res)
}

export async function patchVerticalYacht(
  listingId: string,
  body: {
    length_meters?: string
    cabin_count?: string
    port_lat?: string
    port_lng?: string
    theme_codes?: string[]
    rule_codes?: string[]
    ical_managed?: boolean
  },
): Promise<{ listing_id: string; ok: boolean }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(v(listingId, '/yacht'), {
    method: 'PATCH',
    headers: locJson(),
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `vertical_yacht_patch_${res.status}`)
  }
  return json(res)
}

export async function listVerticalHotelRooms(listingId: string): Promise<{ rooms: Record<string, unknown>[] }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(v(listingId, '/hotel-rooms'))
  if (!res.ok) throw new Error(`vertical_hotel_rooms_${res.status}`)
  return json(res)
}

export async function addVerticalHotelRoom(
  listingId: string,
  body: {
    name: string
    capacity?: string
    board_type?: string
    meta_json?: string
  },
): Promise<{ id: string }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(v(listingId, '/hotel-rooms'), {
    method: 'POST',
    headers: locJson(),
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `vertical_hotel_room_add_${res.status}`)
  }
  return json(res)
}

export async function deleteVerticalHotelRoom(
  listingId: string,
  roomId: string,
): Promise<{ ok: boolean }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(
    `${(process.env.NEXT_PUBLIC_API_URL ?? '').replace(/\/$/, '')}/api/v1/verticals/listings/${encodeURIComponent(listingId)}/hotel-rooms/${encodeURIComponent(roomId)}`,
    { method: 'DELETE' },
  )
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `vertical_hotel_room_delete_${res.status}`)
  }
  return json(res)
}

export async function listVerticalRelatedRules(listingId: string): Promise<{ rules: Record<string, unknown>[] }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(v(listingId, '/related-rules'))
  if (!res.ok) throw new Error(`vertical_related_${res.status}`)
  return json(res)
}

export async function addVerticalRelatedRule(
  listingId: string,
  body: { relation_type: string; target_listing_id?: string; auto_radius_meters?: number },
): Promise<{ id: string }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(v(listingId, '/related-rules'), {
    method: 'POST',
    headers: locJson(),
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `vertical_related_add_${res.status}`)
  }
  return json(res)
}

export async function deleteVerticalRelatedRule(
  listingId: string,
  ruleId: string,
): Promise<{ ok: boolean }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(
    `${(process.env.NEXT_PUBLIC_API_URL ?? '').replace(/\/$/, '')}/api/v1/verticals/listings/${encodeURIComponent(listingId)}/related-rules/${encodeURIComponent(ruleId)}`,
    { method: 'DELETE' },
  )
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `vertical_related_delete_${res.status}`)
  }
  return json(res)
}

export async function listVerticalTransferZones(listingId: string): Promise<{ zones: Record<string, unknown>[] }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(v(listingId, '/transfer-zones'))
  if (!res.ok) throw new Error(`vertical_transfer_zones_${res.status}`)
  return json(res)
}

export async function addVerticalTransferZone(
  listingId: string,
  body: {
    zone_role: string
    location_label: string
    center_lat?: string
    center_lng?: string
    price_per_vehicle_class?: string
  },
): Promise<{ id: string }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(v(listingId, '/transfer-zones'), {
    method: 'POST',
    headers: locJson(),
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `vertical_transfer_zone_add_${res.status}`)
  }
  return json(res)
}

export async function deleteVerticalTransferZone(
  listingId: string,
  zoneId: string,
): Promise<{ ok: boolean }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(
    `${(process.env.NEXT_PUBLIC_API_URL ?? '').replace(/\/$/, '')}/api/v1/verticals/listings/${encodeURIComponent(listingId)}/transfer-zones/${encodeURIComponent(zoneId)}`,
    { method: 'DELETE' },
  )
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `vertical_transfer_zone_delete_${res.status}`)
  }
  return json(res)
}

// ─── Generic Vertical Meta (category-specific JSON blob) ─────────────────────

export async function getVerticalMeta<T = Record<string, unknown>>(
  listingId: string,
  category: string,
): Promise<T> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(
    v(listingId, `/vertical-meta?category=${encodeURIComponent(category)}`),
    typeof window === 'undefined' ? { next: { revalidate: 120 } } : undefined,
  )
  if (!res.ok) throw new Error(`vertical_meta_${res.status}`)
  return json(res) as Promise<T>
}

export async function putVerticalMeta<T = Record<string, unknown>>(
  token: string,
  listingId: string,
  category: string,
  data: T,
  params?: { organizationId?: string },
): Promise<{ ok: boolean }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(v(listingId, `/vertical-meta${catalogListingQs(params)}`), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ category, data }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `vertical_meta_put_${res.status}`)
  }
  return json(res)
}

// ─── Public Listing Search ────────────────────────────────────────────────────

export interface PublicListingSearchParams {
  /** Serbest metin arama */
  q?: string
  /** Kategori kodu: hotel, tour, car_rental, vb. */
  categoryCode?: string
  /** Konum / şehir (serbest metin) */
  location?: string
  /** Giriş tarihi ISO-8601 */
  checkin?: string
  /** Çıkış tarihi ISO-8601 */
  checkout?: string
  /** API `flex_days` — tarih aralığını genişletir (müsaitlik araması) */
  flexDays?: number
  /** Toplam misafir sayısı */
  guests?: number
  /** Sayfa numarası (1 tabanlı) */
  page?: number
  /** Sayfa başına kayıt sayısı */
  perPage?: number
  /** Çekilecek dil kodu */
  locale?: string
  /** Uçuş: kalkış */
  from?: string
  /** Uçuş: varış */
  to?: string
  /** Araç: iade lokasyon tipi */
  drop_off?: string
  /** Belirli ilan UUID'lerini getir (virgülle ayrılmış veya dizi) */
  listingIds?: string[]
  /** Tatil evi: tema kodları (virgülle, ör. sea_view,beachfront) — backend `theme_codes` ile kesişir */
  theme?: string
  /** Vitrin sırası: boş → en yeni; `recommended` \| `rating` → puana göre (önce yüksek yıldız) */
  sort?: string
  /** Tatil evi: `listing_attributes` anahtarları (virgülle, örn. pool,wifi) */
  attrs?: string
  /** Ortak fiyat filtresi */
  priceMin?: string
  priceMax?: string
  /** Tatil evi / yat — minimum yatak, oda, banyo sayısı */
  bedsMin?: string
  bedroomsMin?: string
  bathroomsMin?: string
  /** Otel kategori filtreleri */
  hotelType?: string
  hotelTheme?: string
  hotelAccommodation?: string
  hotelStars?: string
  /** Otel yurtiçi/yurtdışı: `domestic` | `international` */
  hotelScope?: string
  /** Tur kategori filtreleri */
  tourTravelType?: string
  tourAccommodation?: string
  tourDuration?: string
  /** Tur — kalkış şehri / havalimanı (virgülle çoklu) */
  tourDeparture?: string
  /** Tur — kültür bölgesi (kapadokya, karadeniz, … virgülle çoklu) */
  tourRegion?: string
  /** Kruvaziyer — gemi hattı / rota facet */
  cruiseLine?: string
  cruiseRoute?: string
  /** Tatil evi ilan tipi: villa | apart | daire | bungalov */
  propertyType?: string
}

export type MealPlanSummary = 'room_only' | 'meal_only' | 'both'

export interface PublicListingItem {
  id: string
  slug: string
  title: string
  category_code: string
  /** `category_code` ile aynı kaynak (product_categories.code) — SEO için açık alan */
  listing_vertical?: string
  status?: string
  currency_code?: string
  /** `listings.currency_code` — detay sayfasının/checkout'un ana para birimi. */
  listing_currency_code?: string | null
  featured_image_url: string | null
  thumbnail_url: string | null
  price_from: string | null
  /** Tatil evi — `listing_price_rules` geceliklerinden min (katalog arama JSON) */
  price_rules_nightly_min?: string | null
  /** Tatil evi — aynı kümeden max */
  price_rules_nightly_max?: string | null
  /** Tatil evi — arama sorgusundaki check-in/check-out aralığının toplam tutarı (temizlik + kısa konaklama + gecelik/konaklama başına ek ücretler dahil); tarih verilmemişse null. */
  range_total?: string | null
  /** Tatil evi — `range_total` için gece sayısı */
  range_nights?: string | null
  /** Bölge / şehir */
  location: string | null
  /** Harita — API’den (Gleam public search); yoksa mock koordinat veya pinsız */
  map_lat?: string | number | null
  map_lng?: string | number | null
  review_avg: number | null
  review_count?: number
  is_new?: boolean
  discount_percent: number | null
  /** Panel «anında onay» — kampanya öne çıkarma filtresi */
  instant_book?: boolean
  is_campaign?: boolean
  created_at?: string
  /**
   * Yemek planı özeti:
   * - `'room_only'`  → sadece yemeksiz seçenek
   * - `'meal_only'`  → sadece yemekli seçenek(ler)
   * - `'both'`       → hem yemekli hem yemeksiz
   * - `null/undefined` → yemek planı tanımlanmamış
   */
  meal_plan_summary?: MealPlanSummary | null
  /** listing_meta — tatil evi vitrin */
  max_guests?: string | null
  room_count?: string | null
  /** listing_meta — yatak sayısı; vitrin «oda» özeti `room_count` boşsa buradan doldurulur */
  bed_count?: string | null
  bath_count?: string | null
  /** Görünen ilan tipi (ör. Villa, Dubleks) */
  property_type?: string | null
  /** Virgülle tema kodları (listing_holiday_home_details.theme_codes) */
  theme_codes?: string | null
  /** Otel — vitrin `hotel_type` kodu (kategori tema öğeleri ile eşleştirilir) */
  hotel_type_code?: string | null
  /** Otel detay — `listing_hotel_details.star_rating` */
  hotel_star_rating?: string | null
  /** Tur detay — `vertical_tour.duration_days` */
  tour_duration_days?: string | null
  /** Tur detay — `vertical_tour.max_people` */
  tour_max_people?: string | null
  /** Tur detay — `vertical_tour.travel_type` */
  tour_travel_type?: string | null
  /** Tur detay — `vertical_tour.accommodation_type` */
  tour_accommodation_type?: string | null
  /** Tur detay — `vertical_tour.languages` */
  tour_languages?: string | null
  /** Tur — `program_days_json.number_of_nights` veya Wtatil katalog */
  tour_nights?: string | null
  /** Tur — Wtatil `mealType` */
  tour_meal_type?: string | null
  /** Tur — Wtatil `transportType` */
  tour_transport_type?: string | null
  /** Tur — vize gerekli mi (`true` / `false`) */
  tour_visa_required?: string | null
  /** Tur — kalkış noktası (dönem ulaşım detayı, havalimanı kodu veya şehir) */
  tour_departure_place?: string | null
  /** Uçuş — turna | travelrobot (Kplus) */
  external_provider_code?: string | null
  flight_airline_code?: string | null
  flight_airline_name?: string | null
  flight_stop_count?: string | null
  flight_duration?: string | null
  /** Kültür ve Turizm Bakanlığı / tesis belge no — `listings.ministry_license_ref` */
  ministry_license_ref?: string | null
  /** Ön ödeme yüzdesi — `listings.prepayment_percent` */
  prepayment_percent?: string | null
  /** İptal politikası — `listings.cancellation_policy_text` */
  cancellation_policy_text?: string | null
  /** `listings.min_stay_nights` */
  min_stay_nights?: string | null
  allow_sub_min_stay_gap_booking?: string | boolean | null
  /** `listing_meta` — en az kaç gün önceden rezervasyon */
  min_advance_booking_days?: string | null
  /** `listing_meta` — bu geceden kısa konaklamada kısa konaklama ücreti */
  min_short_stay_nights?: string | null
  short_stay_fee?: string | null
  /** Tek seferlik temizlik — `listings.cleaning_fee_amount` */
  cleaning_fee_amount?: string | null
  /** Hasar depozitosu — `listings.first_charge_amount` */
  first_charge_amount?: string | null
  /** Kategori kartı galeri — `listing_images` (en fazla 12, sıralı) */
  gallery_urls?: string[] | null
}

export interface PublicListingSearchResult {
  listings: PublicListingItem[]
  total: number
  page: number
  per_page: number
}

/**
 * Genel ön-yüz ilan arama.
 * API URL tanımlı değilse veya API erişilemezse `null` döner (caller mock'a düşer).
 */
export async function searchPublicListings(
  params: PublicListingSearchParams,
  fetchInit?: RequestInit,
): Promise<PublicListingSearchResult | null> {
  const b = base()
  if (!b) return null

  const u = new URLSearchParams()
  if (params.q?.trim())            u.set('q', params.q.trim())
  if (params.categoryCode?.trim()) u.set('category_code', params.categoryCode.trim())
  if (params.location?.trim())     u.set('location', params.location.trim())
  if (params.checkin?.trim())      u.set('start_date', params.checkin.trim())
  if (params.checkout?.trim())     u.set('end_date', params.checkout.trim())
  if (params.flexDays != null && params.flexDays >= 0) {
    u.set('flex_days', String(params.flexDays))
  }
  if (params.guests && params.guests > 0) u.set('guests', String(params.guests))
  if (params.page && params.page > 1)     u.set('page', String(params.page))
  // Backend catalog public search uses `limit` (see collections_http.search_public_listings)
  if (params.perPage)              u.set('limit', String(params.perPage))
  if (params.locale?.trim())       u.set('locale', params.locale.trim())
  if (params.from?.trim())         u.set('from', params.from.trim())
  if (params.to?.trim())           u.set('to', params.to.trim())
  if (params.drop_off?.trim())     u.set('drop_off', params.drop_off.trim())
  if (params.listingIds?.length)   u.set('listing_ids', params.listingIds.join(','))
  if (params.theme?.trim())        u.set('theme', params.theme.trim())
  if (params.sort?.trim())         u.set('sort', params.sort.trim())
  if (params.attrs?.trim())        u.set('attrs', params.attrs.trim())
  if (params.priceMin?.trim())     u.set('price_min', params.priceMin.trim())
  if (params.priceMax?.trim())     u.set('price_max', params.priceMax.trim())
  if (params.bedsMin?.trim())      u.set('beds', params.bedsMin.trim())
  if (params.bedroomsMin?.trim())  u.set('bedrooms', params.bedroomsMin.trim())
  if (params.bathroomsMin?.trim()) u.set('bathrooms', params.bathroomsMin.trim())
  if (params.hotelType?.trim())    u.set('hotel_type', params.hotelType.trim())
  if (params.hotelTheme?.trim())   u.set('hotel_theme', params.hotelTheme.trim())
  if (params.hotelAccommodation?.trim()) u.set('hotel_accommodation', params.hotelAccommodation.trim())
  if (params.hotelStars?.trim())   u.set('hotel_stars', params.hotelStars.trim())
  if (params.hotelScope?.trim())   u.set('hotel_scope', params.hotelScope.trim())
  if (params.tourTravelType?.trim()) u.set('tour_travel_type', params.tourTravelType.trim())
  if (params.tourAccommodation?.trim()) u.set('tour_accommodation', params.tourAccommodation.trim())
  if (params.tourDuration?.trim()) u.set('tour_duration', params.tourDuration.trim())
  if (params.tourDeparture?.trim()) u.set('tour_departure', params.tourDeparture.trim())
  if (params.tourRegion?.trim()) u.set('tour_region', params.tourRegion.trim())
  if (params.cruiseLine?.trim()) u.set('cruise_line', params.cruiseLine.trim())
  if (params.cruiseRoute?.trim()) u.set('cruise_route', params.cruiseRoute.trim())
  if (params.propertyType?.trim()) u.set('property_type', params.propertyType.trim())

  try {
    const init: RequestInit =
      typeof window === 'undefined'
        ? fetchInit?.cache === 'no-store'
          ? fetchInit
          : ({ next: { revalidate: 60 }, ...(fetchInit ?? {}) } as RequestInit)
        : fetchInit ?? {}

    const res = await fetch(
      `${b}/api/v1/catalog/public/listings${u.toString() ? `?${u.toString()}` : ''}`,
      init,
    )
    if (!res.ok) return null
    return json<PublicListingSearchResult>(res)
  } catch {
    return null
  }
}

export interface PublicThemeItem {
  code: string
  label: string
}

/** Herkese açık — vitrin tema filtresi etiketleri (katalog `category_theme_items`) */
export async function listPublicThemeItems(params: {
  categoryCode: string
  locale?: string
}): Promise<{ items: PublicThemeItem[] } | null> {
  const b = base()
  if (!b) return null
  const u = new URLSearchParams()
  u.set('category_code', params.categoryCode.trim())
  if (params.locale?.trim()) u.set('locale', params.locale.trim())
  try {
    const res = await fetch(`${b}/api/v1/catalog/public/theme-items?${u}`, {
      next: { revalidate: 300 },
    })
    if (!res.ok) return null
    return json<{ items: PublicThemeItem[] }>(res)
  } catch {
    return null
  }
}

const STAY_PAGE_LISTING_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** GET /catalog/public/listings/by-slug/:slug — tam slug eşleşmesi (detay sayfası). */
export async function resolvePublicListingIdBySlug(slug: string): Promise<string | null> {
  const s = slug.trim()
  if (!s) return null
  const b = base()
  if (!b) return null
  try {
    const res = await fetch(
      `${b}/api/v1/catalog/public/listings/by-slug/${encodeURIComponent(s)}`,
      { next: { revalidate: 60 } },
    )
    if (res.status === 404) return null
    if (!res.ok) return null
    const data = (await res.json()) as { id?: string }
    const id = data.id?.trim()
    return id || null
  } catch {
    return null
  }
}

/**
 * Konaklama vitrin URL'sindeki handle (slug veya UUID) için yayında ilan id'si.
 * Mock stay verisindeki sahte id'ler yerine API UUID kullanılır; yemek planları vitrinde görünür.
 */
export async function resolvePublishedListingIdForStayPage(
  handle: string,
  locale?: string,
): Promise<string | null> {
  const h = handle.trim()
  if (!h) return null
  if (STAY_PAGE_LISTING_UUID_RE.test(h)) return h

  const byExactSlug = await resolvePublicListingIdBySlug(h)
  if (byExactSlug) return byExactSlug

  const res = await searchPublicListings({ q: h, locale, perPage: 40 })
  if (!res?.listings?.length) return null
  const hl = h.toLowerCase()
  const bySlug = res.listings.find((l) => l.slug.toLowerCase() === hl)
  if (bySlug) return bySlug.id
  if (res.listings.length === 1) return res.listings[0].id
  return null
}

// ─── Listing Basics PATCH ─────────────────────────────────────────────────────
export interface ListingBasicsPatch {
  status?: '' | 'draft' | 'published' | 'archived'
  min_stay_nights?: string   // number string or '__null__'
  /** Tutar metni veya kolonu temizlemek için tam olarak `'__null__'` */
  cleaning_fee_amount?: string
  first_charge_amount?: string
  prepayment_percent?: string
  commission_percent?: string
  pool_size_label?: string
  // Provizyon alanları
  high_season_dates_json?: string
  confirm_deadline_normal_h?: string
  confirm_deadline_high_h?: string
  supplier_payment_note?: string
  avg_ad_cost_percent?: string
  // İçerik & lisanslama
  cancellation_policy_text?: string
  ministry_license_ref?: string
  external_listing_ref?: string
  // Sosyal & AI
  share_to_social?: boolean
  allow_ai_caption?: boolean
  allow_sub_min_stay_gap_booking?: boolean
  /** true → kilidi kaldır (is_locked: false) ve status değiştir; gönderilmezse kilit korunur */
  is_locked?: boolean
}

/** GET /catalog/listings/:id/basics — panel «Temel ilan ayarları» (`listings` tablosu). */
export interface ListingBasicsSnapshot {
  status: string
  min_stay_nights: string
  cleaning_fee_amount: string
  first_charge_amount: string
  prepayment_percent: string
  commission_percent: string
  cancellation_policy_text: string
  ministry_license_ref: string
  external_listing_ref?: string
  pool_size_label?: string
  high_season_dates_json?: string
  confirm_deadline_normal_h?: string
  confirm_deadline_high_h?: string
  supplier_payment_note?: string
  avg_ad_cost_percent?: string
  share_to_social: boolean
  allow_ai_caption: boolean
  allow_sub_min_stay_gap_booking: boolean
  is_locked: boolean
}

export async function getListingBasics(
  token: string,
  listingId: string,
  params?: { organizationId?: string },
): Promise<ListingBasicsSnapshot> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(
    `${b}/api/v1/catalog/listings/${listingId}/basics${catalogListingQs(params)}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    },
  )
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `listing_basics_get_${res.status}`)
  }
  return json<ListingBasicsSnapshot>(res)
}

export async function patchListingBasics(
  token: string,
  listingId: string,
  body: ListingBasicsPatch,
  params?: { organizationId?: string },
): Promise<{ ok: boolean }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(
    `${b}/api/v1/catalog/listings/${listingId}/basics${catalogListingQs(params)}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    },
  )
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `listing_basics_patch_${res.status}`)
  }
  return json(res)
}

export async function patchListingSlug(
  token: string,
  listingId: string,
  body: { slug: string },
  params?: { organizationId?: string },
): Promise<{ slug: string }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(
    `${b}/api/v1/catalog/listings/${listingId}/slug${catalogListingQs(params)}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    },
  )
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `listing_slug_patch_${res.status}`)
  }
  return json<{ slug: string }>(res)
}

// ─── Owner Contact GET / PUT ──────────────────────────────────────────────────
export interface ListingOwnerContact {
  contact_name: string | null
  /** Vitrin ilan sahibi kartı — admin panelinden girilir */
  contact_bio?: string | null
  contact_phone: string | null
  contact_email: string | null
}

export async function getListingOwnerContact(
  token: string,
  listingId: string,
  params?: { organizationId?: string },
): Promise<ListingOwnerContact> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(
    `${b}/api/v1/catalog/listings/${listingId}/owner-contact${catalogListingQs(params)}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    },
  )
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `owner_contact_get_${res.status}`)
  }
  return json(res)
}

export async function putListingOwnerContact(
  token: string,
  listingId: string,
  body: {
    contact_name?: string
    contact_phone?: string
    contact_email?: string
    contact_bio?: string
  },
  params?: { organizationId?: string },
): Promise<{ ok: boolean }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(
    `${b}/api/v1/catalog/listings/${listingId}/owner-contact${catalogListingQs(params)}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    },
  )
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `owner_contact_put_${res.status}`)
  }
  return json(res)
}

// ─── Listing Meta GET / PUT ───────────────────────────────────────────────────
export interface ListingMeta {
  address?: string
  lat?: string
  lng?: string
  check_in_time?: string
  check_out_time?: string
  bed_count?: string
  bath_count?: string
  square_meters?: string
  max_guests?: string
  /** Rezervasyon için minimum kaç gün önceden (ör. 7) */
  min_advance_booking_days?: string
  room_count?: string
  /** Vitrin kartında görünen ilan tipi (ör. Villa, Dubleks) */
  property_type?: string
  /** Villa sahibi — BTrans / ödeme raporlaması */
  owner_tc_no?: string
  owner_bank_name?: string
  owner_iban?: string
  owner_account_type?: string
  owner_residence_address?: string
  youtube_url?: string
  tourism_cert_no?: string
  short_stay_fee?: string
  min_short_stay_nights?: string
  /** Vitrin konum: semt / mahalle (ör. Ölüdeniz, Kalkan) */
  district_label?: string
  /** Vitrin konum: ilçe (ör. Fethiye, Kaş) */
  city?: string
  /** Vitrin konum: il (ör. Muğla, Antalya) */
  province_city?: string
}

/** PostgreSQL jsonb, string değerlerde U+0000 kabul etmez; kayıt öncesi tüm düğümlerde çıkarılır. */
const META_JSON_SKIP_KEYS = new Set(['__proto__', 'constructor', 'prototype'])

function stripNullBytesDeep(value: unknown): unknown {
  if (typeof value === 'string') return value.replace(/\0/g, '')
  if (value === null || typeof value !== 'object') return value
  if (Array.isArray(value)) return value.map(stripNullBytesDeep)
  const o = value as Record<string, unknown>
  const out: Record<string, unknown> = {}
  for (const k of Object.keys(o)) {
    if (META_JSON_SKIP_KEYS.has(k)) continue
    out[k] = stripNullBytesDeep(o[k])
  }
  return out
}

/** GET birleşimi sayısal lat/lng veya kirli jsonb anahtarları gönderebilir; PG güncellemesi yalnızca düz metin bekler. */
const LISTING_META_PUT_KEYS = new Set([
  'address',
  'lat',
  'lng',
  'check_in_time',
  'check_out_time',
  'bed_count',
  'bath_count',
  'square_meters',
  'max_guests',
  'min_advance_booking_days',
  'room_count',
  'property_type',
  'owner_tc_no',
  'owner_bank_name',
  'owner_iban',
  'owner_account_type',
  'owner_residence_address',
  'youtube_url',
  'tourism_cert_no',
  'short_stay_fee',
  'min_short_stay_nights',
  'district_label',
  'city',
  'province_city',
])

/** listings.map_lat / map_lng = NUMERIC(10,7); aralık dışı veya aşırı hassas değerler PG güncellemesini düşürür */
function sanitizeListingMetaCoord(raw: unknown, isLat: boolean): string | undefined {
  if (raw === null || raw === undefined) return undefined
  const s =
    typeof raw === 'number' && Number.isFinite(raw)
      ? String(raw)
      : typeof raw === 'string'
        ? raw.replace(/\0/g, '').trim().replace(',', '.')
        : ''
  if (s === '') return undefined
  const n = Number(s)
  if (!Number.isFinite(n)) return undefined
  const limit = isLat ? 90 : 180
  if (Math.abs(n) > limit) return undefined
  const rounded = Math.round(n * 1e7) / 1e7
  return String(rounded)
}

function flattenListingMetaForPut(meta: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {}
  for (const key of Object.keys(meta)) {
    if (!LISTING_META_PUT_KEYS.has(key)) continue
    const v = meta[key]
    if (v === null || v === undefined) continue
    if (key === 'lat') {
      const s = sanitizeListingMetaCoord(v, true)
      if (s !== undefined) out[key] = s
      continue
    }
    if (key === 'lng') {
      const s = sanitizeListingMetaCoord(v, false)
      if (s !== undefined) out[key] = s
      continue
    }
    if (typeof v === 'boolean') {
      out[key] = v ? 'true' : 'false'
      continue
    }
    if (typeof v === 'number' && Number.isFinite(v)) {
      out[key] = String(v)
      continue
    }
    if (typeof v === 'string') {
      const t = v.replace(/\0/g, '').trim()
      if (t !== '') out[key] = t
      continue
    }
  }
  return out
}

export async function getListingMeta(
  token: string,
  listingId: string,
  params?: { organizationId?: string },
): Promise<ListingMeta> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(
    `${b}/api/v1/catalog/listings/${listingId}/meta${catalogListingQs(params)}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    },
  )
  if (!res.ok) throw new Error(`listing_meta_get_${res.status}`)
  return json(res)
}

export async function putListingMeta(
  token: string,
  listingId: string,
  body: ListingMeta | Record<string, unknown>,
  params?: { organizationId?: string },
): Promise<{ ok: boolean }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const sanitized = stripNullBytesDeep(body) as Record<string, unknown>
  const flattened = flattenListingMetaForPut(sanitized)
  const res = await fetch(
    `${b}/api/v1/catalog/listings/${listingId}/meta${catalogListingQs(params)}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(flattened),
    },
  )
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `listing_meta_put_${res.status}`)
  }
  return json(res)
}

// ─── Attribute Groups ─────────────────────────────────────────────────────────
export interface AttributeGroup {
  id: string
  code: string
  name: string
  category_codes: string[]
  sort_order: number
  is_active: boolean
}

export interface AttributeDef {
  id: string
  code: string
  label: string
  field_type: 'text' | 'number' | 'boolean' | 'select' | 'multiselect'
  options_json: string | null
  sort_order: number
  is_required: boolean
  is_active: boolean
  icon_url?: string | null
}

function catalogOrgQueryParam(organizationId?: string): string {
  const o = organizationId?.trim()
  if (!o) return ''
  return `organization_id=${encodeURIComponent(o)}`
}

export async function listAttributeGroups(
  token: string,
  params?: { categoryCode?: string; locale?: string; organizationId?: string },
): Promise<{ groups: AttributeGroup[] }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const sp = new URLSearchParams()
  if (params?.categoryCode) sp.set('category_code', params.categoryCode)
  if (params?.locale) sp.set('locale', params.locale)
  if (params?.organizationId?.trim()) sp.set('organization_id', params.organizationId.trim())
  const qs = sp.toString() ? `?${sp.toString()}` : ''
  const res = await fetch(`${b}/api/v1/catalog/attribute-groups${qs}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(`attr_groups_${res.status}`)
  return json(res)
}

export async function createAttributeGroup(
  token: string,
  body: { code: string; name: string; category_codes?: string; sort_order?: string },
  organizationId?: string,
): Promise<{ id: string; ok: boolean }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const oq = catalogOrgQueryParam(organizationId)
  const res = await fetch(
    `${b}/api/v1/catalog/attribute-groups${oq ? `?${oq}` : ''}`,
    {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
    },
  )
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `attr_group_create_${res.status}`)
  }
  return json(res)
}

export async function deleteAttributeGroup(
  token: string,
  gid: string,
  organizationId?: string,
): Promise<{ ok: boolean }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const oq = catalogOrgQueryParam(organizationId)
  const res = await fetch(
    `${b}/api/v1/catalog/attribute-groups/${gid}${oq ? `?${oq}` : ''}`,
    {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
    },
  )
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `attr_group_delete_${res.status}`)
  }
  return json(res)
}

export async function listAttributeDefs(
  token: string,
  gid: string,
  params?: { locale?: string; organizationId?: string },
): Promise<{ defs: AttributeDef[] }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const sp = new URLSearchParams()
  if (params?.locale) sp.set('locale', params.locale)
  if (params?.organizationId?.trim()) sp.set('organization_id', params.organizationId.trim())
  const qs = sp.toString() ? `?${sp.toString()}` : ''
  const res = await fetch(`${b}/api/v1/catalog/attribute-groups/${gid}/defs${qs}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(`attr_defs_${res.status}`)
  return json(res)
}

export async function createAttributeDef(
  token: string,
  gid: string,
  body: {
    code: string
    label: string
    field_type?: string
    options_json?: string
    sort_order?: string
  },
  organizationId?: string,
): Promise<{ id: string; ok: boolean }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const oq = catalogOrgQueryParam(organizationId)
  const res = await fetch(
    `${b}/api/v1/catalog/attribute-groups/${gid}/defs${oq ? `?${oq}` : ''}`,
    {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
    },
  )
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `attr_def_create_${res.status}`)
  }
  return json(res)
}

export async function deleteAttributeDef(
  token: string,
  did: string,
  organizationId?: string,
): Promise<{ ok: boolean }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const oq = catalogOrgQueryParam(organizationId)
  const res = await fetch(
    `${b}/api/v1/catalog/attribute-defs/${did}${oq ? `?${oq}` : ''}`,
    {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
    },
  )
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `attr_def_delete_${res.status}`)
  }
  return json(res)
}

export async function patchAttributeDef(
  token: string,
  defId: string,
  body: { icon_url: string },
  organizationId?: string,
): Promise<{ ok: boolean }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const oq = catalogOrgQueryParam(organizationId)
  const res = await fetch(
    `${b}/api/v1/catalog/attribute-defs/${encodeURIComponent(defId)}${oq ? `?${oq}` : ''}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    },
  )
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `attr_def_patch_${res.status}`)
  }
  return json(res)
}

export async function putAttributeDefTranslations(
  token: string,
  defId: string,
  body: { entries: { locale_code: string; label: string }[] },
  organizationId?: string,
): Promise<{ ok: boolean }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const oq = catalogOrgQueryParam(organizationId)
  const res = await fetch(
    `${b}/api/v1/catalog/attribute-defs/${defId}/translations${oq ? `?${oq}` : ''}`,
    {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
    },
  )
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `attr_def_trans_${res.status}`)
  }
  return json(res)
}

export async function putAttributeGroupTranslations(
  token: string,
  groupId: string,
  body: { entries: { locale_code: string; name: string }[] },
  organizationId?: string,
): Promise<{ ok: boolean }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const oq = catalogOrgQueryParam(organizationId)
  const res = await fetch(
    `${b}/api/v1/catalog/attribute-groups/${groupId}/translations${oq ? `?${oq}` : ''}`,
    {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
    },
  )
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `attr_group_trans_${res.status}`)
  }
  return json(res)
}

export type PriceLineItem = {
  id: string
  scope: 'included' | 'excluded'
  code: string
  label: string
  sort_order: number
  is_active: boolean
}

export async function listPriceLineItems(
  token: string,
  params: { categoryCode: string; locale?: string; organizationId?: string },
): Promise<{ items: PriceLineItem[] }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const sp = new URLSearchParams({ category_code: params.categoryCode })
  if (params.locale) sp.set('locale', params.locale)
  if (params.organizationId) sp.set('organization_id', params.organizationId)
  const res = await fetch(`${b}/api/v1/catalog/price-line-items?${sp.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(`price_line_items_${res.status}`)
  return json(res)
}

export async function createPriceLineItem(
  token: string,
  body: {
    category_code: string
    scope: 'included' | 'excluded'
    code: string
    sort_order?: string
    label: string
  },
  options?: { organizationId?: string },
): Promise<{ id: string; ok: boolean }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const sp = new URLSearchParams()
  if (options?.organizationId) sp.set('organization_id', options.organizationId)
  const qs = sp.toString() ? `?${sp.toString()}` : ''
  const res = await fetch(`${b}/api/v1/catalog/price-line-items${qs}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `price_line_create_${res.status}`)
  }
  return json(res)
}

export async function deletePriceLineItem(
  token: string,
  itemId: string,
  options?: { organizationId?: string },
): Promise<{ ok: boolean }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const sp = new URLSearchParams()
  if (options?.organizationId) sp.set('organization_id', options.organizationId)
  const qs = sp.toString() ? `?${sp.toString()}` : ''
  const res = await fetch(
    `${b}/api/v1/catalog/price-line-items/${encodeURIComponent(itemId)}${qs}`,
    {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    },
  )
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `price_line_del_${res.status}`)
  }
  return json(res)
}

export async function putPriceLineItemTranslations(
  token: string,
  itemId: string,
  body: { entries: { locale_code: string; label: string }[] },
  options?: { organizationId?: string },
): Promise<{ ok: boolean }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const sp = new URLSearchParams()
  if (options?.organizationId) sp.set('organization_id', options.organizationId)
  const qs = sp.toString() ? `?${sp.toString()}` : ''
  const res = await fetch(
    `${b}/api/v1/catalog/price-line-items/${encodeURIComponent(itemId)}/translations${qs}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    },
  )
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `price_line_trans_${res.status}`)
  }
  return json(res)
}

export async function getListingPriceLineSelections(
  token: string,
  listingId: string,
  params?: { organizationId?: string },
): Promise<{ item_ids: string[] }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(
    `${b}/api/v1/catalog/listings/${encodeURIComponent(listingId)}/price-line-selections${catalogListingQs(params)}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    },
  )
  if (!res.ok) throw new Error(`price_line_sel_get_${res.status}`)
  return json(res)
}

export async function putListingPriceLineSelections(
  token: string,
  listingId: string,
  body: { item_ids: string[] },
  params?: { organizationId?: string },
): Promise<{ ok: boolean }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(
    `${b}/api/v1/catalog/listings/${encodeURIComponent(listingId)}/price-line-selections${catalogListingQs(params)}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    },
  )
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `price_line_sel_put_${res.status}`)
  }
  return json(res)
}

// ─── Listing Attribute Values ─────────────────────────────────────────────────
export interface ListingAttrValue {
  group_code: string
  key: string
  value_json: string
}

export async function getListingAttributeValues(
  token: string,
  listingId: string,
): Promise<{ values: ListingAttrValue[] }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/catalog/listings/${listingId}/attribute-values`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(`attr_values_get_${res.status}`)
  return json(res)
}

export async function putListingAttributeValues(
  token: string,
  listingId: string,
  values: { group_code: string; key: string; value: string }[],
  params?: { organizationId?: string },
): Promise<{ ok: boolean }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/catalog/listings/${encodeURIComponent(listingId)}/attribute-values${catalogListingQs(params)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(values),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `attr_values_put_${res.status}`)
  }
  return json(res)
}

// ─── Collections ──────────────────────────────────────────────────────────────

export type ListingCollection = {
  id: string
  slug: string
  title: string
  description: string | null
  hero_image_url: string | null
  filter_rules: string
  sort_order: number
  is_active: boolean
}

export type CollectionFilterRules = {
  q?: string
  category_codes?: string[]
  locations?: string[]
  tags?: string[]
  min_price?: number | null
  max_price?: number | null
}

export async function listCollections(params?: { all?: boolean }): Promise<{ collections: ListingCollection[] }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const q = new URLSearchParams()
  if (params?.all) q.set('all', 'true')
  const res = await fetch(`${b}/api/v1/collections${q.toString() ? `?${q}` : ''}`, { next: { revalidate: 60 } })
  if (!res.ok) throw new Error(`collections_${res.status}`)
  return json(res)
}

export async function getCollectionBySlug(slug: string): Promise<{ collection: ListingCollection }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/collections/${encodeURIComponent(slug)}`, { next: { revalidate: 60 } })
  if (!res.ok) throw new Error(`collection_${res.status}`)
  return json(res)
}

export async function createCollection(
  token: string,
  body: { slug: string; title: string; description?: string; hero_image_url?: string; filter_rules?: string },
): Promise<{ id: string }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/collections`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `collection_create_${res.status}`)
  }
  return json(res)
}

export async function patchCollection(
  token: string,
  id: string,
  body: Partial<{
    slug: string; title: string; description: string | null; hero_image_url: string | null;
    filter_rules: string; sort_order: number; is_active: boolean;
  }>,
): Promise<{ ok: boolean }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/collections/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `collection_patch_${res.status}`)
  }
  return json(res)
}

export async function deleteCollection(token: string, id: string): Promise<{ ok: boolean }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/collections/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `collection_delete_${res.status}`)
  }
  return json(res)
}

// ─── Tedarikçi Başvuru Sistemi ───────────────────────────────────────────────

export type SupplierApplicationDoc = {
  id: string
  doc_type: string
  doc_label: string
  file_path: string
  status: 'pending' | 'uploaded' | 'approved' | 'rejected'
}

export type SupplierApplication = {
  id: string
  user_id: string
  category_code: string
  status: 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected'
  business_name: string
  business_type: string
  tax_number: string
  phone: string
  address: string
  notes: string
  admin_notes: string
  created_at: string
  submitted_at?: string
  reviewed_at?: string
  documents: SupplierApplicationDoc[]
}

export type AdminSupplierApplication = SupplierApplication & {
  email: string
  display_name: string
}

export async function listMySupplierApplications(token: string): Promise<{ applications: SupplierApplication[] }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/supplier/applications`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(`supplier_apps_${res.status}`)
  return json(res)
}

export async function upsertSupplierApplication(
  token: string,
  body: {
    category_code: string
    business_name?: string
    business_type?: string
    tax_number?: string
    phone?: string
    address?: string
    notes?: string
  },
): Promise<{ id: string; ok: boolean }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/supplier/applications`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.clone().json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `supplier_app_${res.status}`)
  }
  return json(res)
}

export async function uploadSupplierDocument(
  token: string,
  applicationId: string,
  body: { doc_type: string; doc_label: string; file_path: string },
): Promise<{ ok: boolean }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/supplier/applications/${applicationId}/documents`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`upload_doc_${res.status}`)
  return json(res)
}

export async function submitSupplierApplication(token: string, applicationId: string): Promise<{ ok: boolean }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/supplier/applications/${applicationId}/submit`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(`submit_app_${res.status}`)
  return json(res)
}

export async function adminListSupplierApplications(
  token: string,
  status?: string,
): Promise<{ applications: AdminSupplierApplication[] }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const q = status && status !== 'all' ? `?status=${encodeURIComponent(status)}` : ''
  const res = await fetch(`${b}/api/v1/admin/supplier-applications${q}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(`admin_supplier_apps_${res.status}`)
  return json(res)
}

export async function adminApproveSupplierApplication(token: string, id: string): Promise<{ ok: boolean }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/admin/supplier-applications/${id}/approve`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(`approve_app_${res.status}`)
  return json(res)
}

export async function adminRejectSupplierApplication(
  token: string,
  id: string,
  adminNotes?: string,
): Promise<{ ok: boolean }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/admin/supplier-applications/${id}/reject`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ admin_notes: adminNotes ?? '' }),
  })
  if (!res.ok) throw new Error(`reject_app_${res.status}`)
  return json(res)
}

// ─── Subcategory (Site Config tabanlı JSON depolama) ──────────────────────────

export interface SubcategoryConfigEntry {
  id: string
  slug: string
  parentCategorySlug: string
  name: string
  nameEn: string
  emoji: string
  description: string
  descriptionEn: string
  color: string
  order: number
  enabled: boolean
  href?: string
}

/**
 * Yönetim panelinden kaydedilen alt kategori override listesini çeker.
 * Bulunamazsa null döner — çağıran fallback olarak static registry kullanır.
 */
export async function getSubcategoryConfig(
  token: string,
): Promise<{ subcategories: SubcategoryConfigEntry[] } | null> {
  const b = base()
  if (!b) return null
  try {
    const res = await fetch(`${b}/api/v1/admin/site-config/subcategories`, {
      headers: { Authorization: `Bearer ${token}` },
      next: { revalidate: 0 },
    })
    if (!res.ok) return null
    return json<{ subcategories: SubcategoryConfigEntry[] }>(res)
  } catch {
    return null
  }
}

/** Alt kategori konfigürasyonunu kaydeder (tam liste) */
export async function saveSubcategoryConfig(
  token: string,
  subcategories: SubcategoryConfigEntry[],
): Promise<{ ok: boolean }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/admin/site-config/subcategories`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ subcategories }),
  })
  if (!res.ok) throw new Error(`save_subcategories_${res.status}`)
  return json(res)
}

// ─── İş planı & portal duyuruları (admin / staff / supplier / agency) ───────────

export type WorkspaceTask = {
  id: string
  title: string
  body: string
  due_date: string | null
  remind_at: string | null
  assignee_user_id: string | null
  assignee_label: string
  created_by_user_id: string
  status: string
  created_at: string
  updated_at: string
  assign_to_all_staff: boolean
}

export type PortalAnnouncement = {
  id: string
  audience: string
  target_all: boolean
  title: string
  body: string
  created_at: string
  expires_at: string | null
  created_by_label: string
}

export async function listAdminWorkspaceTasks(token: string): Promise<{ tasks: WorkspaceTask[] }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/admin/workspace/tasks`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `admin_workspace_tasks_${res.status}`)
  }
  return json(res)
}

export async function createAdminWorkspaceTask(
  token: string,
  body: {
    title: string
    body?: string
    due_date?: string
    remind_at?: string
    assignee_user_id?: string
  },
): Promise<{ id: string }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/admin/workspace/tasks`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `admin_workspace_task_create_${res.status}`)
  }
  return json(res)
}

export async function patchAdminWorkspaceTask(
  token: string,
  taskId: string,
  body: {
    title: string
    body?: string
    due_date?: string
    remind_at?: string
    assignee_user_id?: string
    status: string
  },
): Promise<{ ok: boolean }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/admin/workspace/tasks/${encodeURIComponent(taskId)}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `admin_workspace_task_patch_${res.status}`)
  }
  return json(res)
}

export async function deleteAdminWorkspaceTask(token: string, taskId: string): Promise<{ ok: boolean }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/admin/workspace/tasks/${encodeURIComponent(taskId)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `admin_workspace_task_del_${res.status}`)
  }
  return json(res)
}

export async function listAdminWorkspaceAnnouncements(
  token: string,
): Promise<{ announcements: PortalAnnouncement[] }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/admin/workspace/announcements`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `admin_workspace_ann_${res.status}`)
  }
  return json(res)
}

export async function createAdminWorkspaceAnnouncement(
  token: string,
  body: {
    audience: 'supplier' | 'agency'
    target_all: boolean
    title: string
    body?: string
    expires_at?: string
    recipient_organization_ids?: string[]
  },
): Promise<{ id: string }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/admin/workspace/announcements`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `admin_workspace_ann_create_${res.status}`)
  }
  return json(res)
}

export async function listWorkspaceRecipientOrgs(
  token: string,
  audience: 'supplier' | 'agency',
): Promise<{ organizations: { id: string; name: string; slug: string }[] }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const q = new URLSearchParams({ audience })
  const res = await fetch(`${b}/api/v1/admin/workspace/recipient-orgs?${q}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `workspace_recipient_orgs_${res.status}`)
  }
  return json(res)
}

export async function listWorkspaceStaffAssignees(
  token: string,
): Promise<{ users: { id: string; label: string }[] }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/admin/workspace/staff-assignees`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `workspace_staff_assignees_${res.status}`)
  }
  return json(res)
}

export async function listStaffWorkspaceTasks(token: string): Promise<{ tasks: WorkspaceTask[] }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/staff/workspace/tasks`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `staff_workspace_tasks_${res.status}`)
  }
  return json(res)
}

export async function patchStaffWorkspaceTask(
  token: string,
  taskId: string,
  status: 'open' | 'done',
): Promise<{ ok: boolean }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/staff/workspace/tasks/${encodeURIComponent(taskId)}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `staff_workspace_task_patch_${res.status}`)
  }
  return json(res)
}

// ─── DeepSeek Agent Merkezi ──────────────────────────────────────────────────

export type AgentCenterAgent = {
  code: string
  feature_profile_code: string | null
  display_name: string
  description: string
  mode: string
  status: string
  risk_level: string
  schedule_json: string
  last_run_at: string | null
}

export type AgentCenterRun = {
  id: string
  agent_code: string
  trigger_type: string
  status: string
  started_at: string
  finished_at: string | null
  input_json: string
  summary_json: string
}

export type AgentRecommendation = {
  id: string
  agent_code: string
  kind: string
  target_key: string
  title: string
  reason: string
  payload_json: string
  status: string
  ai_job_id: string | null
  created_at: string
  updated_at: string
  reviewer_user_id: string | null
  review_note: string | null
  reviewed_at: string | null
  applied_at: string | null
}

export type AgentOverview = {
  agents: AgentCenterAgent[]
  recent_runs: AgentCenterRun[]
  recommendation_counts: Record<string, number>
}

export type RunSupervisorResult = {
  run_id: string
  scanned: number
  created: number
  failed: number
}

export async function getAgentOverview(token: string): Promise<AgentOverview> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/agents/overview`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `agent_overview_${res.status}`)
  }
  return json(res)
}

export type CommerceAgentOverview = {
  agents: Array<{
    code: string
    display_name: string
    description: string
    mode: string
    status: string
    risk_level: string
    last_run_at: string
  }>
  recent_jobs: Array<{
    id: string
    profile_code: string
    status: string
    created_at: string
    error: string
  }>
  recommendation_counts: Array<{ status: string; count: number }>
}

export async function getCommerceAgentOverview(token: string): Promise<CommerceAgentOverview> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/agents/commerce/overview`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `commerce_overview_${res.status}`)
  }
  return json(res)
}

export async function runDueCommerceAgents(token: string): Promise<{ processed: number }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/agents/commerce/run-due`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: '{}',
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `commerce_run_due_${res.status}`)
  }
  return json(res)
}

export async function runAgentSupervisor(token: string): Promise<RunSupervisorResult> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/agents/supervisor/run`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: '{}',
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `agent_supervisor_${res.status}`)
  }
  return json(res)
}

export async function runDueAgentSupervisor(
  token: string,
): Promise<RunSupervisorResult | { due: false }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/agents/supervisor/run-due`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: '{}',
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `agent_supervisor_due_${res.status}`)
  }
  return json(res)
}

export async function listAgentRecommendations(
  token: string,
): Promise<{ recommendations: AgentRecommendation[] }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/agents/recommendations`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `agent_recommendations_${res.status}`)
  }
  return json(res)
}

export async function patchAgentRecommendation(
  token: string,
  recommendationId: string,
  status: 'pending' | 'approved' | 'applied' | 'rejected' | 'expired',
  reviewNote = '',
): Promise<{ ok: boolean; popup_id?: string }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/agents/recommendations/${encodeURIComponent(recommendationId)}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ status, review_note: reviewNote }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `agent_recommendation_patch_${res.status}`)
  }
  return json(res)
}

export async function listSupplierAnnouncements(token: string): Promise<{ announcements: PortalAnnouncement[] }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/supplier/announcements`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `supplier_announcements_${res.status}`)
  }
  return json(res)
}

export async function listAgencyAnnouncements(token: string): Promise<{ announcements: PortalAnnouncement[] }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/agency/announcements`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `agency_announcements_${res.status}`)
  }
  return json(res)
}

// ─── Public Marketing (Page Builder vitrin modülleri için) ───────────────────
// Auth gerektirmez; storefront tarafında ISR ile çağrılır.

/** Aktif kampanyalar listesi. type: campaigns.campaign_type filtresi (örn. 'flash', 'early_booking'). */
export async function listPublicActiveCampaigns(params?: {
  type?: string
  limit?: number
}): Promise<{ campaigns: Campaign[] }> {
  const b = base()
  if (!b) return { campaigns: [] }
  const q = new URLSearchParams()
  if (params?.type) q.set('type', params.type)
  if (params?.limit) q.set('limit', String(params.limit))
  try {
    const res = await fetch(`${b}/api/v1/public/marketing/active-campaigns${q.toString() ? `?${q}` : ''}`, {
      next: { revalidate: 60 },
    })
    if (!res.ok) return { campaigns: [] }
    return json(res)
  } catch {
    return { campaigns: [] }
  }
}

export type ListingDetailCampaignPublic = {
  id: string
  kind: string
  title: string
  name_translations?: string
  rules_json?: string
  starts_at: string | null
  ends_at: string | null
  discount_percent: string | null
}

/** İlan detay sayfası kampanyaları (kart taksit + ilana özel indirim). */
export async function fetchPublicListingDetailCampaigns(params: {
  listingId: string
  categoryCode: string
}): Promise<{ campaigns: ListingDetailCampaignPublic[] }> {
  const b = base()
  if (!b) return { campaigns: [] }
  const q = new URLSearchParams({
    listing_id: params.listingId,
    category_code: params.categoryCode,
  })
  try {
    const res = await fetch(`${b}/api/v1/public/marketing/listing-detail-campaigns?${q}`, {
      next: { revalidate: 60 },
    })
    if (!res.ok) return { campaigns: [] }
    return json(res)
  } catch {
    return { campaigns: [] }
  }
}

export type CampaignListingLink = {
  listing_id: string
  listing_title: string
  discount_percent: string | null
}

export async function getCampaignListings(
  token: string,
  campaignId: string,
): Promise<{ listings: CampaignListingLink[] }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/marketing/campaigns/${campaignId}/listings`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(`campaign_listings_${res.status}`)
  return json(res)
}

export async function putCampaignListings(
  token: string,
  campaignId: string,
  listings: Array<{ listing_id: string; discount_percent: number | string }>,
): Promise<{ ok: boolean }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/marketing/campaigns/${campaignId}/listings`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ listings }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `campaign_listings_put_${res.status}`)
  }
  return json(res)
}

/** Sadece is_public=true kuponlar. Vitrin şeridi/banner için. */
export async function listPublicActiveCoupons(params?: {
  limit?: number
}): Promise<{ coupons: Coupon[] }> {
  const b = base()
  if (!b) return { coupons: [] }
  const q = new URLSearchParams()
  if (params?.limit) q.set('limit', String(params.limit))
  try {
    const res = await fetch(`${b}/api/v1/public/marketing/active-coupons${q.toString() ? `?${q}` : ''}`, {
      next: { revalidate: 60 },
    })
    if (!res.ok) return { coupons: [] }
    return json(res)
  } catch {
    return { coupons: [] }
  }
}

/** Tatil paketleri (vitrinde "Hazır Paketler" modülü). */
export async function listPublicHolidayPackages(params?: {
  limit?: number
}): Promise<{ packages: HolidayPackage[] }> {
  const b = base()
  if (!b) return { packages: [] }
  const q = new URLSearchParams()
  if (params?.limit) q.set('limit', String(params.limit))
  try {
    const res = await fetch(`${b}/api/v1/public/marketing/holiday-packages${q.toString() ? `?${q}` : ''}`, {
      next: { revalidate: 60 },
    })
    if (!res.ok) return { packages: [] }
    return json(res)
  } catch {
    return { packages: [] }
  }
}

// ─── Coupon name/description i18n helper'ları ────────────────────────────────

/** name_translations / description_translations JSONB string'ini güvenli parse. */
export function parseCouponTranslations(raw: string | undefined | null): Record<string, string> {
  if (!raw) return {}
  try {
    const v = JSON.parse(raw)
    if (v && typeof v === 'object' && !Array.isArray(v)) return v as Record<string, string>
  } catch {
    /* noop */
  }
  return {}
}

/** Coupon vitrin başlığını locale'e göre seçer; boşsa code fallback. */
export function pickCouponName(coupon: Coupon, locale: string): string {
  const map = parseCouponTranslations(coupon.name_translations)
  const v = map[locale]
  if (v && v.trim()) return v
  if (coupon.name && coupon.name.trim()) return coupon.name
  return coupon.code
}

/** Coupon açıklamasını locale'e göre seçer; boş ise boş string döner. */
export function pickCouponDescription(coupon: Coupon, locale: string): string {
  const map = parseCouponTranslations(coupon.description_translations)
  const v = map[locale]
  if (v && v.trim()) return v
  return coupon.description ?? ''
}

// ---------------------------------------------------------------------------
// İlçe gezi fikirleri — toplu AI üretimi
// ---------------------------------------------------------------------------

export interface DistrictIdeasStats {
  total_districts: number
  districts_with_content: number
  /** travel_ideas_json tamamen boş ([]) ilçe sayısı */
  districts_travel_ideas_empty?: number
  /** Tek öğeli Maps yer tutucu özeti (tahmini) — include_weak ile kuyruğa alınabilir */
  districts_placeholder_guess?: number
  jobs: Record<string, number>
}

export async function getDistrictIdeasStats(token: string): Promise<DistrictIdeasStats> {
  const b = base()
  if (!b) throw new Error('api_not_configured')
  const res = await fetch(`${b}/api/v1/ai/district-ideas/stats`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(`district_ideas_stats_${res.status}`)
  const raw = await json<Record<string, unknown>>(res)
  return {
    total_districts: coerceInt(raw.total_districts),
    districts_with_content: coerceInt(raw.districts_with_content),
    districts_travel_ideas_empty: coerceOptionalInt(raw.districts_travel_ideas_empty),
    districts_placeholder_guess: coerceOptionalInt(raw.districts_placeholder_guess),
    jobs: stringRecordInts(raw.jobs),
  }
}

export async function queueAllDistrictIdeas(
  token: string,
  opts?: { includeWeak?: boolean },
): Promise<{ queued: number; total_found: number; message?: string; include_weak?: boolean }> {
  const b = base()
  if (!b) throw new Error('api_not_configured')
  const qs =
    opts?.includeWeak === true ? '?include_weak=1' : ''
  const res = await fetch(`${b}/api/v1/ai/district-ideas/queue-all${qs}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(`district_ideas_queue_${res.status}`)
  const raw = await json<Record<string, unknown>>(res)
  const message = typeof raw.message === 'string' ? raw.message.trim() : undefined
  const include_weak =
    raw.include_weak === true ||
    raw.include_weak === 'true' ||
    coerceInt(raw.include_weak) === 1
  return {
    queued: coerceInt(raw.queued),
    total_found: coerceInt(raw.total_found),
    message,
    include_weak,
  }
}

export interface DistrictIdeasProcessResult {
  done: boolean
  message?: string
  job_id?: string
  location_page_id?: string
  ideas_stored?: boolean
  skipped?: boolean
}

export async function processNextDistrictIdea(
  token: string,
  opts?: { upstreamTimeoutMs?: number },
): Promise<DistrictIdeasProcessResult> {
  const b = base()
  if (!b) throw new Error('api_not_configured')
  const res = await fetch(`${b}/api/v1/ai/district-ideas/process-next`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    ...fetchInitUpstreamOptional(opts?.upstreamTimeoutMs),
  })
  if (!res.ok) throw new Error(`district_ideas_process_${res.status}`)
  return json<DistrictIdeasProcessResult>(res)
}

// ---------------------------------------------------------------------------
// Kategori bazlı ilan içerik — TR açıklama → çeviri → SEO
// ---------------------------------------------------------------------------

export interface ListingContentStats {
  total_listings: number
  listings_need_work: number
  category_code: string
  batches: Record<string, number>
  pending_phases: Record<string, number>
}

export async function getListingContentStats(
  token: string,
  categoryCode: string,
): Promise<ListingContentStats> {
  const b = base()
  if (!b) throw new Error('api_not_configured')
  const qs = categoryCode.trim() ? `?category_code=${encodeURIComponent(categoryCode.trim())}` : ''
  const res = await fetch(`${b}/api/v1/ai/listing-content/stats${qs}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(await errorCodeFromJsonOrStatus(res, 'listing_content_stats_failed'))
  const raw = await json<Record<string, unknown>>(res)
  return {
    total_listings: coerceInt(raw.total_listings),
    listings_need_work: coerceInt(raw.listings_need_work),
    category_code: typeof raw.category_code === 'string' ? raw.category_code : categoryCode,
    batches: stringRecordInts(raw.batches),
    pending_phases: stringRecordInts(raw.pending_phases),
  }
}

export async function queueAllListingContent(
  token: string,
  opts: {
    category_code: string
    only_incomplete?: boolean
    overwrite?: boolean
  },
): Promise<{
  queued: number
  total_found: number
  message?: string
  category_code?: string
  only_incomplete?: boolean
  overwrite?: boolean
}> {
  const b = base()
  if (!b) throw new Error('api_not_configured')
  const res = await fetch(`${b}/api/v1/ai/listing-content/queue-all`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      category_code: opts.category_code,
      only_incomplete: opts.only_incomplete !== false,
      overwrite: opts.overwrite === true,
    }),
  })
  if (!res.ok) throw new Error(await errorCodeFromJsonOrStatus(res, 'listing_content_queue_failed'))
  const raw = await json<Record<string, unknown>>(res)
  const message = typeof raw.message === 'string' ? raw.message.trim() : undefined
  return {
    queued: coerceInt(raw.queued),
    total_found: coerceInt(raw.total_found),
    message,
    category_code: typeof raw.category_code === 'string' ? raw.category_code : opts.category_code,
    only_incomplete: raw.only_incomplete === true,
    overwrite: raw.overwrite === true,
  }
}

export interface ListingContentProcessResult {
  done: boolean
  message?: string
  failed?: boolean
  error?: string
  batch_id?: string
  listing_id?: string
  category_code?: string
  phase?: string
  next_phase?: string
  progressed?: boolean
}

export async function processNextListingContent(
  token: string,
  opts?: { upstreamTimeoutMs?: number },
): Promise<ListingContentProcessResult> {
  const b = base()
  if (!b) throw new Error('api_not_configured')
  const res = await fetch(`${b}/api/v1/ai/listing-content/process-next`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    ...fetchInitUpstreamOptional(opts?.upstreamTimeoutMs),
  })
  if (!res.ok) throw new Error(await errorCodeFromJsonOrStatus(res, 'listing_content_process_failed'))
  return json<ListingContentProcessResult>(res)
}

export async function resetStuckListingContent(
  token: string,
): Promise<{ reset: number; ids: string[] }> {
  const b = base()
  if (!b) throw new Error('api_not_configured')
  const res = await fetch(`${b}/api/v1/ai/listing-content/reset-stuck`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(await errorCodeFromJsonOrStatus(res, 'listing_content_reset_failed'))
  const raw = await json<Record<string, unknown>>(res)
  const ids = Array.isArray(raw.ids) ? raw.ids.filter((x): x is string => typeof x === 'string') : []
  return { reset: coerceInt(raw.reset), ids }
}

// ---------------------------------------------------------------------------
// Gezi rotaları + mavi yolculuk — AI üretimi (trip_planner / blue_cruise_routes)
// ---------------------------------------------------------------------------

export type AiTripRoutesProfile = 'trip_planner' | 'blue_cruise_routes'

export interface TripRoutesStats {
  profile: AiTripRoutesProfile
  total_locations: number
  locations_with_routes: number
  locations_routes_empty?: number
  jobs: Record<string, number>
}

export async function getTripRoutesStats(
  token: string,
  profile: AiTripRoutesProfile,
): Promise<TripRoutesStats> {
  const b = base()
  if (!b) throw new Error('api_not_configured')
  const res = await fetch(`${b}/api/v1/ai/trip-routes/stats?profile=${profile}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(await errorCodeFromJsonOrStatus(res, 'trip_routes_stats'))
  const raw = await json<Record<string, unknown>>(res)
  return {
    profile,
    total_locations: coerceInt(raw.total_locations),
    locations_with_routes: coerceInt(raw.locations_with_routes),
    locations_routes_empty: coerceOptionalInt(raw.locations_routes_empty),
    jobs: stringRecordInts(raw.jobs),
  }
}

export async function queueAllTripRoutes(
  token: string,
  profile: AiTripRoutesProfile,
): Promise<{ queued: number; total_found: number; message?: string; profile: AiTripRoutesProfile }> {
  const b = base()
  if (!b) throw new Error('api_not_configured')
  const res = await fetch(`${b}/api/v1/ai/trip-routes/queue-all?profile=${profile}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(`trip_routes_queue_${res.status}`)
  const raw = await json<Record<string, unknown>>(res)
  const message = typeof raw.message === 'string' ? raw.message.trim() : undefined
  return {
    queued: coerceInt(raw.queued),
    total_found: coerceInt(raw.total_found),
    message,
    profile,
  }
}

export interface TripRoutesProcessResult {
  done: boolean
  message?: string
  job_id?: string
  location_page_id?: string
  routes_stored?: boolean
  profile?: AiTripRoutesProfile
}

export async function processNextTripRoute(
  token: string,
  profile: AiTripRoutesProfile,
  opts?: { upstreamTimeoutMs?: number },
): Promise<TripRoutesProcessResult> {
  const b = base()
  if (!b) throw new Error('api_not_configured')
  const res = await fetch(`${b}/api/v1/ai/trip-routes/process-next?profile=${profile}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    ...fetchInitUpstreamOptional(opts?.upstreamTimeoutMs),
  })
  if (!res.ok) throw new Error(`trip_routes_process_${res.status}`)
  return json<TripRoutesProcessResult>(res)
}

export async function resetStuckTripRouteJobs(
  token: string,
  profile: AiTripRoutesProfile,
): Promise<{ reset: number }> {
  const b = base()
  if (!b) throw new Error('api_not_configured')
  const res = await fetch(`${b}/api/v1/ai/trip-routes/reset-stuck?profile=${profile}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(`trip_routes_reset_${res.status}`)
  const raw = await json<Record<string, unknown>>(res)
  return { reset: coerceInt(raw.reset) }
}

// ---------------------------------------------------------------------------
// Bölge tanıtım yazısı + bölge blog yazıları — toplu AI üretimi
// ---------------------------------------------------------------------------

async function errorCodeFromJsonOrStatus(res: Response, fallbackPrefix: string): Promise<string> {
  let text = ''
  try {
    text = await res.clone().text()
  } catch {
    return `${fallbackPrefix}_${res.status}`
  }
  const trimmed = text.trim()
  if (!trimmed) return `${fallbackPrefix}_${res.status}`
  try {
    const body = parseLenientJson(trimmed) as { error?: unknown }
    const e = body.error
    if (typeof e === 'string' && e.trim()) return e.trim()
  } catch {
    /* JSON değil */
  }
  // Nginx / proxy düz metin veya kısa hata gövdeleri
  if (trimmed.length <= 400 && !/<!DOCTYPE|<html[\s>]/i.test(trimmed)) {
    return trimmed
  }
  return `${fallbackPrefix}_${res.status}`
}

export interface RegionContentStats {
  total_regions: number
  regions_with_description: number
  generated_blog_posts: number
  place_blog_candidates: number
  generated_place_blog_posts: number
  batches: Record<string, number>
  place_blog_batches: Record<string, number>
}

export async function getRegionContentStats(token: string): Promise<RegionContentStats> {
  const b = base()
  if (!b) throw new Error('api_not_configured')
  const res = await fetch(`${b}/api/v1/ai/region-content/stats`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(await errorCodeFromJsonOrStatus(res, 'region_content_stats'))
  const raw = await json<Record<string, unknown>>(res)
  return {
    total_regions: coerceInt(raw.total_regions),
    regions_with_description: coerceInt(raw.regions_with_description),
    generated_blog_posts: coerceInt(raw.generated_blog_posts),
    place_blog_candidates: coerceInt(raw.place_blog_candidates),
    generated_place_blog_posts: coerceInt(raw.generated_place_blog_posts),
    batches: stringRecordInts(raw.batches),
    place_blog_batches: stringRecordInts(raw.place_blog_batches),
  }
}

export async function queueAllRegionContent(
  token: string,
  postsPerRegion = 1,
): Promise<{ queued: number; posts_per_region: number }> {
  const b = base()
  if (!b) throw new Error('api_not_configured')
  const res = await fetch(`${b}/api/v1/ai/region-content/queue-all`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ posts_per_region: postsPerRegion }),
  })
  if (!res.ok) throw new Error(await errorCodeFromJsonOrStatus(res, 'region_content_queue'))
  const raw = await json<Record<string, unknown>>(res)
  return {
    queued: coerceInt(raw.queued),
    posts_per_region: coerceInt(raw.posts_per_region, 1),
  }
}

export interface RegionContentProcessResult {
  done: boolean
  message?: string
  batch_id?: string
  location_page_id?: string
  slug_path?: string
  region_type?: string
  name?: string
  had_description?: boolean
  description_written?: boolean
  blog_posts_created?: number
}

export async function processNextRegionContent(
  token: string,
  opts?: { upstreamTimeoutMs?: number },
): Promise<RegionContentProcessResult> {
  const b = base()
  if (!b) throw new Error('api_not_configured')
  const res = await fetch(`${b}/api/v1/ai/region-content/process-next`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    ...fetchInitUpstreamOptional(opts?.upstreamTimeoutMs),
  })
  if (!res.ok) throw new Error(await errorCodeFromJsonOrStatus(res, 'region_content_process'))
  return json<RegionContentProcessResult>(res)
}

export async function queueAllPlaceBlogs(
  token: string,
  postsPerLocation = 1,
): Promise<{ queued: number; posts_per_location: number }> {
  const b = base()
  if (!b) throw new Error('api_not_configured')
  const res = await fetch(`${b}/api/v1/ai/place-blogs/queue-all`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ posts_per_region: postsPerLocation }),
  })
  if (!res.ok) throw new Error(await errorCodeFromJsonOrStatus(res, 'place_blogs_queue'))
  const raw = await json<Record<string, unknown>>(res)
  return {
    queued: coerceInt(raw.queued),
    posts_per_location: coerceInt(raw.posts_per_location, 1),
  }
}

export interface PlaceBlogProcessResult {
  done: boolean
  message?: string
  batch_id?: string
  location_page_id?: string
  slug_path?: string
  region_type?: string
  name?: string
  ideas_context_chars?: number
  blog_posts_created?: number
}

export async function processNextPlaceBlog(
  token: string,
  opts?: { upstreamTimeoutMs?: number },
): Promise<PlaceBlogProcessResult> {
  const b = base()
  if (!b) throw new Error('api_not_configured')
  const res = await fetch(`${b}/api/v1/ai/place-blogs/process-next`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    ...fetchInitUpstreamOptional(opts?.upstreamTimeoutMs),
  })
  if (!res.ok) throw new Error(await errorCodeFromJsonOrStatus(res, 'place_blogs_process'))
  return json<PlaceBlogProcessResult>(res)
}

export interface NextEmptyDistrict {
  done: boolean
  location_page_id?: string
  slug_path?: string
  district_name?: string
  region_name?: string
  country_name?: string
  /** İlçe merkezi (varsa — region fallback ile) */
  center_lat?: string
  center_lng?: string
}

export async function getNextEmptyDistrict(token: string): Promise<NextEmptyDistrict> {
  const b = base()
  if (!b) throw new Error('api_not_configured')
  const res = await fetch(`${b}/api/v1/ai/district-ideas/next-empty`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(`next_empty_district_${res.status}`)
  return json<NextEmptyDistrict>(res)
}

export async function saveDistrictPlaces(
  token: string,
  locationPageId: string,
  ideasJson: string,
  centerCoords?: { lat: number; lng: number },
): Promise<void> {
  const b = base()
  if (!b) throw new Error('api_not_configured')
  const body: Record<string, unknown> = { location_page_id: locationPageId, ideas_json: ideasJson }
  if (centerCoords) {
    body.center_lat = String(centerCoords.lat)
    body.center_lng = String(centerCoords.lng)
  }
  const res = await fetch(`${b}/api/v1/ai/district-ideas/save-places`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`save_district_places_${res.status}`)
}

// ---------------------------------------------------------------------------
// İlan yakın mekan (POI) mesafe hesabı
// ---------------------------------------------------------------------------

export interface NearbyPoi {
  title: string
  summary?: string
  image?: string
  link?: string
  blog_slug?: string
  place_id?: string
  lat: number
  lng: number
  distance_km: number
  distance_km_from_listing?: number
  distance_km_from_district?: number
}

/** GET nearby-pois yanıtı — `nearby_pois` JSON dizesi veya doğrudan dizi olabilir. */
export function parseNearbyPoisPayload(raw: unknown): NearbyPoi[] {
  if (Array.isArray(raw)) return raw as NearbyPoi[]
  if (typeof raw !== 'string') return []
  const trimmed = raw.trim()
  if (!trimmed) return []
  try {
    const parsed = parseLenientJson(trimmed) as unknown
    return Array.isArray(parsed) ? (parsed as NearbyPoi[]) : []
  } catch {
    return []
  }
}

/** Mekan başlıklarına göre blog yazısı slug'larını döndürür (herkese açık). */
export async function getBlogSlugsByTitles(
  titles: string[],
  categorySlug = 'favori-mekanlar',
): Promise<Record<string, string>> {
  if (!titles.length) return {}
  const b = base()
  if (!b) return {}
  try {
    const res = await fetch(`${b}/api/v1/blog/posts/slugs-by-titles`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ titles: JSON.stringify(titles), category_slug: categorySlug }),
    })
    if (!res.ok) return {}
    const data = await res.json() as { slugs: Record<string, string> }
    return data.slugs ?? {}
  } catch {
    return {}
  }
}

/** Sunucu tarafında Haversine hesabı yapar ve listings.nearby_pois_json'u günceller. */
export async function computeListingNearbyPois(
  token: string,
  listingId: string,
): Promise<{ listing_id: string; nearby_pois: NearbyPoi[] }> {
  const b = base()
  if (!b) throw new Error('api_not_configured')
  const res = await fetch(`${b}/api/v1/listings/${listingId}/compute-nearby-pois`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(`compute_nearby_pois_${res.status}`)
  const data = await json<{ listing_id: string; nearby_pois: unknown }>(res)
  return {
    listing_id: data.listing_id,
    nearby_pois: parseNearbyPoisPayload(data.nearby_pois),
  }
}

/** İlanın mevcut nearby_pois_json'unu getirir (önbellek). */
export async function getListingNearbyPois(listingId: string): Promise<NearbyPoi[]> {
  const b = base()
  if (!b) return []
  try {
    const res = await fetch(`${b}/api/v1/listings/${listingId}/nearby-pois`)
    if (!res.ok) return []
    const data = await json<{ nearby_pois: unknown }>(res)
    return parseNearbyPoisPayload(data.nearby_pois)
  } catch {
    return []
  }
}

/** İlanın nearby_pois_json'unu doğrudan yazar (admin / Maps fallback). */
export async function patchListingNearbyPois(
  token: string,
  listingId: string,
  pois: NearbyPoi[],
): Promise<void> {
  const b = base()
  if (!b) throw new Error('api_not_configured')
  const res = await fetch(`${b}/api/v1/listings/${listingId}/nearby-pois`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ nearby_pois_json: JSON.stringify(pois) }),
  })
  if (!res.ok) throw new Error(`patch_nearby_pois_${res.status}`)
}

export interface ServicePoi {
  type: string
  label?: string
  distance_km: number
  duration_text?: string
}

export interface ListingServicePois {
  amenities: ServicePoi[]
  transport: ServicePoi[]
}

/** Temel ihtiyaç ve ulaşım mekanlarını getirir (herkese açık, RSC için). */
export async function getListingServicePois(listingId: string): Promise<ListingServicePois> {
  const b = base()
  if (!b) return { amenities: [], transport: [] }
  try {
    const res = await fetch(`${b}/api/v1/listings/${listingId}/service-pois`)
    if (!res.ok) return { amenities: [], transport: [] }
    const data = await res.json() as { amenities_pois_json: string; transport_pois_json: string }
    return {
      amenities: JSON.parse(data.amenities_pois_json ?? '[]') as ServicePoi[],
      transport: JSON.parse(data.transport_pois_json ?? '[]') as ServicePoi[],
    }
  } catch {
    return { amenities: [], transport: [] }
  }
}

/** Temel ihtiyaç ve ulaşım mekanlarını yazar (admin). */
export async function patchListingServicePois(
  token: string,
  listingId: string,
  amenities: ServicePoi[],
  transport: ServicePoi[],
): Promise<void> {
  const b = base()
  if (!b) throw new Error('api_not_configured')
  const res = await fetch(`${b}/api/v1/listings/${listingId}/service-pois`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      amenities_pois_json: JSON.stringify(amenities),
      transport_pois_json: JSON.stringify(transport),
    }),
  })
  if (!res.ok) throw new Error(`patch_service_pois_${res.status}`)
}

// ─── District-based Service POIs (287) ────────────────────────────────────────

export interface DistrictServicePoi {
  /** Vitrin satırı etiketi veya tip anahtarı */
  type: string
  /** Google’dan gelen mekân adı */
  label: string
  googleType?: string
  lat: number
  lng: number
  category?: 'sightseeing' | 'amenity' | 'transport'
  /** `google_vitrin` — toplu çekmede üretilen; yeniden çekmede kaldırılır */
  source?: string
  place_id?: string
}

/** İlçenin service_pois_json'unu getirir. */
export async function getLpServicePois(lpId: string): Promise<DistrictServicePoi[]> {
  const b = base()
  if (!b) return []
  try {
    const res = await fetch(`${b}/api/v1/location-pages/${lpId}/service-pois`)
    if (!res.ok) return []
    const data = await res.json() as { service_pois_json: string }
    return JSON.parse(data.service_pois_json ?? '[]') as DistrictServicePoi[]
  } catch { return [] }
}

/** İlçenin service_pois_json'unu yazar (admin). */
export async function patchLpServicePois(
  token: string,
  lpId: string,
  pois: DistrictServicePoi[],
): Promise<void> {
  const b = base()
  if (!b) throw new Error('api_not_configured')
  const res = await fetch(`${b}/api/v1/location-pages/${lpId}/service-pois`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ service_pois_json: JSON.stringify(pois) }),
  })
  if (!res.ok) throw new Error(`patch_lp_service_pois_${res.status}`)
}

export interface NextWithoutServicePois {
  done: boolean
  location_page_id?: string
  location_name?: string
  center_lat?: string
  center_lng?: string
  parent_name?: string
}

/** Batch için: service_pois_json olmayan sonraki ilçeyi döndürür. */
export async function getNextWithoutServicePois(token: string): Promise<NextWithoutServicePois> {
  const b = base()
  if (!b) return { done: true }
  const res = await fetch(`${b}/api/v1/location-pages/next-without-service-pois`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) return { done: true }
  return res.json() as Promise<NextWithoutServicePois>
}

/** İlanın koordinatlarından Haversine ile hesaplanmış servis mesafelerini döndürür. */
export async function getComputedServicePois(listingId: string): Promise<ListingServicePois> {
  const b = base()
  if (!b) return { amenities: [], transport: [] }
  try {
    const res = await fetch(`${b}/api/v1/listings/${listingId}/computed-service-pois`)
    if (!res.ok) return { amenities: [], transport: [] }
    return res.json() as Promise<ListingServicePois>
  } catch { return { amenities: [], transport: [] } }
}

// ─── Pexels ───────────────────────────────────────────────────────────────────

export interface PexelsPhoto {
  id: number
  alt: string
  photographer: string
  src: { large: string; medium: string; small: string }
}

/** Pexels proxy üzerinden arama yapar. apiKey artık URL'de gönderilmez; sunucu tarafında yüklenir. */
export async function searchPexelsImage(
  query: string,
  _apiKey: string,
  perPage = 1,
): Promise<PexelsPhoto[]> {
  const params = new URLSearchParams({ q: query, per_page: String(perPage) })
  const res = await fetch(`/api/pexels-search?${params}`)
  if (!res.ok) throw new Error(`pexels_${res.status}`)
  const data = await res.json() as { photos: PexelsPhoto[]; total: number }
  return data.photos ?? []
}

/** Kapak resmi olmayan sonraki lokasyonu döndürür (ülke, il, ilçe, belde). */
export async function getNextNoCoverDistrict(
  token: string,
): Promise<{ done: true } | { done: false; location_page_id: string; slug_path: string; region_type: string; location_name: string; parent_name: string }> {
  const b = base()
  if (!b) throw new Error('api_not_configured')
  const res = await fetch(`${b}/api/v1/ai/district-ideas/next-no-cover`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(`next_no_cover_${res.status}`)
  return json<{ done: true } | { done: false; location_page_id: string; slug_path: string; region_type: string; location_name: string; parent_name: string }>(res)
}

export interface CoverStats {
  total: number
  has_cover: number
  not_found: number
  empty: number
}

export interface NotFoundCoverItem {
  id: string
  slug_path: string
  region_type: string
  location_name: string
  parent_name: string
}

export async function getCoverStats(token: string): Promise<CoverStats> {
  const b = base()
  if (!b) throw new Error('api_not_configured')
  const res = await fetch(`${b}/api/v1/ai/district-ideas/cover-stats`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(`cover_stats_${res.status}`)
  const raw = await json<Record<string, unknown>>(res)
  return {
    total: coerceInt(raw.total),
    has_cover: coerceInt(raw.has_cover),
    not_found: coerceInt(raw.not_found),
    empty: coerceInt(raw.empty),
  }
}

export async function getNotFoundCovers(token: string): Promise<NotFoundCoverItem[]> {
  const b = base()
  if (!b) throw new Error('api_not_configured')
  const res = await fetch(`${b}/api/v1/ai/district-ideas/not-found-covers`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(`not_found_covers_${res.status}`)
  const data = await json<unknown>(res)
  if (!Array.isArray(data)) throw new Error(`not_found_covers_invalid_${res.status}`)
  return data as NotFoundCoverItem[]
}

/** İlçe kapak + isteğe bağlı mozaik galerisi kaydeder. */
export async function saveDistrictCover(
  token: string,
  locationPageId: string,
  coverImage: string,
  opts?: { featured_image_url?: string; gallery_json?: string },
): Promise<void> {
  const b = base()
  if (!b) throw new Error('api_not_configured')
  const body: Record<string, string> = {
    location_page_id: locationPageId,
    cover_image: coverImage,
  }
  if (opts?.featured_image_url?.trim()) body.featured_image_url = opts.featured_image_url.trim()
  if (opts?.gallery_json?.trim()) body.gallery_json = opts.gallery_json.trim()
  const res = await fetch(`${b}/api/v1/ai/district-ideas/save-cover`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`save_cover_${res.status}`)
}

export async function resetNotFoundCovers(token: string): Promise<{ reset_count: number }> {
  const b = base()
  if (!b) throw new Error('api_not_configured')
  const res = await fetch(`${b}/api/v1/ai/district-ideas/reset-not-found`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(`reset_not_found_${res.status}`)
  const raw = await json<Record<string, unknown>>(res)
  return { reset_count: coerceInt(raw.reset_count) }
}

export async function resetStuckDistrictJobs(token: string): Promise<{ reset_count: number }> {
  const b = base()
  if (!b) throw new Error('api_not_configured')
  const res = await fetch(`${b}/api/v1/ai/district-ideas/reset-stuck`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(`reset_stuck_district_${res.status}`)
  const raw = await json<Record<string, unknown>>(res)
  return { reset_count: coerceInt(raw.reset_count) }
}

export async function resetStuckBatchJobs(token: string): Promise<{ geo_reset: number; place_reset: number }> {
  const b = base()
  if (!b) throw new Error('api_not_configured')
  const res = await fetch(`${b}/api/v1/ai/region-content/reset-stuck`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(`reset_stuck_batches_${res.status}`)
  const raw = await json<Record<string, unknown>>(res)
  return { geo_reset: coerceInt(raw.geo_reset), place_reset: coerceInt(raw.place_reset) }
}

export interface AiWorkerBackgroundOptions {
  steps?: number
  delayMs?: number
  district?: boolean
  region?: boolean
  place?: boolean
  trip?: boolean
  blue?: boolean
}

export interface AiWorkerBackgroundStartResult {
  started: boolean
  mode?: string
  message?: string
  steps?: number
  delay_ms?: number
  district: boolean
  region: boolean
  place: boolean
  trip?: boolean
  blue?: boolean
}

function appendAiWorkerFlag(qs: URLSearchParams, key: string, value: boolean | undefined): void {
  if (value === false) qs.set(key, '0')
  if (value === true) qs.set(key, '1')
}

export async function startAiWorkerBackground(
  token: string,
  opts: AiWorkerBackgroundOptions = {},
): Promise<AiWorkerBackgroundStartResult> {
  const b = base()
  if (!b) throw new Error('api_not_configured')
  const qs = new URLSearchParams()
  if (opts.steps != null) qs.set('steps', String(Math.trunc(opts.steps)))
  if (opts.delayMs != null) qs.set('delay_ms', String(Math.trunc(opts.delayMs)))
  appendAiWorkerFlag(qs, 'district', opts.district)
  appendAiWorkerFlag(qs, 'region', opts.region)
  appendAiWorkerFlag(qs, 'place', opts.place)
  appendAiWorkerFlag(qs, 'trip', opts.trip)
  appendAiWorkerFlag(qs, 'blue', opts.blue)

  const query = qs.toString()
  const suffix = query ? `?${query}` : ''
  const res = await fetch(`${b}/api/v1/ai/worker/start-background${suffix}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(`ai_worker_start_background_${res.status}`)
  const raw = await json<Record<string, unknown>>(res)
  return {
    started: raw.started === true,
    mode: typeof raw.mode === 'string' ? raw.mode : undefined,
    message: typeof raw.message === 'string' ? raw.message : undefined,
    steps: raw.steps == null ? undefined : coerceInt(raw.steps),
    delay_ms: raw.delay_ms == null ? undefined : coerceInt(raw.delay_ms),
    district: raw.district === true,
    region: raw.region === true,
    place: raw.place === true,
    trip: raw.trip === true,
    blue: raw.blue === true,
  }
}

// ─── Listing nearby POIs ──────────────────────────────────────────────────────

export async function computeAllListingsNearbyPois(
  token: string,
  onProgress?: (done: number, total: number, listingId: string) => void,
): Promise<{ processed: number; skipped: number }> {
  const b = base()
  if (!b) throw new Error('api_not_configured')
  // Koordinatı olan ilanları listele
  const listRes = await fetch(
    `${b}/api/v1/listings?has_map_coords=1&status=published&limit=500`,
    { headers: { Authorization: `Bearer ${token}` } },
  )
  if (!listRes.ok) throw new Error(`listings_list_${listRes.status}`)
  const listData = await listRes.json() as { listings?: Array<{ id: string }> }
  const listings = listData.listings ?? []
  let processed = 0
  let skipped = 0
  for (const l of listings) {
    try {
      const r = await computeListingNearbyPois(token, l.id)
      if (r.nearby_pois.length > 0) processed++
      else skipped++
    } catch {
      skipped++
    }
    onProgress?.(processed + skipped, listings.length, l.id)
    await new Promise((res) => setTimeout(res, 300))
  }
  return { processed, skipped }
}

// ─── Operations Center ────────────────────────────────────────────────────────

export interface OperationsOverviewCounts {
  pending_reservations: number
  payment_pending: number
  supplier_pending: number
  overdue_provizyon: number
  open_escalations: number
  open_chats: number
  pending_transfers: number
}

export interface OperationsTaskItem {
  id: string
  public_code?: string
  task_type?: string
  guest_name?: string
  listing_title?: string
  starts_on?: string
  ends_on?: string
  status?: string
  payment_status?: string
  due_at?: string
  is_overdue?: boolean
  amount?: string
  currency_code?: string
  reason?: string
  note?: string
  ai_mode?: string
  locale?: string
  started_at?: string
  last_message?: string
}

export interface OperationsOverview {
  counts: OperationsOverviewCounts
  tasks: {
    upcoming: OperationsTaskItem[]
    supplier_deadlines: OperationsTaskItem[]
    payment_transfers: OperationsTaskItem[]
    escalations: OperationsTaskItem[]
    chats: OperationsTaskItem[]
  }
  generated_at: string
}

export async function getOperationsOverview(token: string): Promise<OperationsOverview> {
  const b = base()
  if (!b) throw new Error('api_not_configured')
  const res = await fetch(`${b}/api/v1/operations/overview`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(`operations_overview_${res.status}`)
  return json<OperationsOverview>(res)
}
