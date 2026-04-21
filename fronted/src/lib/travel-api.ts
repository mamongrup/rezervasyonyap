/**
 * Yönetim API istemcisi — rezervasyon, kimlik, katalog, destek, ödeme (PayTR) uçları.
 * PostgreSQL tabanlı backend; üretimde ortam değişkenleri ve güvenli anahtar yönetimi kullanın.
 */

import { apiOriginForFetch } from '@/lib/api-origin'
import { formatLocalYmd } from '@/lib/date-format-local'
import { parseLenientJson } from '@/lib/json-parse'

const base = () => apiOriginForFetch()

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
}

/** Vitrin için otel oda listesi — auth gerektirmez. Boş dönerse vitrinin demo akışı çalışır. */
export async function getPublicHotelRooms(
  listingId: string,
): Promise<{ rooms: PublicHotelRoom[] }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(
    `${b}/api/v1/verticals/listings/${encodeURIComponent(listingId)}/hotel-rooms`,
    { cache: 'no-store' },
  )
  if (!res.ok) throw new Error(`hotel_rooms_public_${res.status}`)
  return json(res)
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
): Promise<{ values: PublicListingAttribute[] }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(
    `${b}/api/v1/public/listings/${encodeURIComponent(listingId)}/attributes`,
    { cache: 'no-store' },
  )
  if (!res.ok) throw new Error(`public_attrs_${res.status}`)
  return json(res)
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
): Promise<{ ok: boolean }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(
    `${b}/api/v1/listings/${encodeURIComponent(listingId)}/perks`,
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

export async function addCartLine(
  cartId: string,
  body: {
    listing_id: string
    quantity: number
    starts_on: string
    ends_on: string
    unit_price: string
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
  },
): Promise<{ listings: ManageListingRow[] }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const u = new URLSearchParams()
  if (params.categoryCode) u.set('category_code', params.categoryCode)
  if (params.search?.trim()) u.set('search', params.search.trim())
  if (params.organizationId?.trim()) u.set('organization_id', params.organizationId.trim())
  if (params.titleLocale?.trim()) u.set('title_locale', params.titleLocale.trim().toLowerCase())
  const qs = u.toString()
  const res = await fetch(`${b}/api/v1/catalog/manage-listings${qs ? `?${qs}` : ''}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `manage_listings_${res.status}`)
  }
  return json<{ listings: ManageListingRow[] }>(res)
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
  body: { name: string; capacity?: string; board_type?: string; meta_json?: string },
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

/** Yayında ilan — katalogdan başlık, açıklama, iletişim adı (vitrin detay sayfası) */
export type PublicListingVitrine = {
  title: string
  description: string
  contact_name: string | null
}

export async function getPublicListingVitrine(
  listingId: string,
  locale?: string,
): Promise<PublicListingVitrine | null> {
  const b = base()
  if (!b) return null
  const u = new URLSearchParams()
  if (locale?.trim()) u.set('locale', locale.trim())
  try {
    const res = await fetch(
      `${b}/api/v1/catalog/public/listings/${encodeURIComponent(listingId)}/vitrine${u.toString() ? `?${u}` : ''}`,
      { next: { revalidate: 60 } },
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

export type ListingAvailabilityDay = {
  day: string
  is_available: boolean
  price_override: string | null
  /** Öğleden önce müsait (yoksa `is_available` kullanılır) */
  am_available?: boolean
  /** Öğleden sonra müsait (yoksa `is_available` kullanılır) */
  pm_available?: boolean
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
): Promise<{ rules: CategoryAccommodationRuleItem[]; selectedIds: string[] } | null> {
  const b = base()
  if (!b) return null
  try {
    const res = await fetch(
      `${b}/api/v1/catalog/public/listings/${encodeURIComponent(listingId)}/accommodation-rules`,
      { next: { revalidate: 120 } },
    )
    if (!res.ok) return null
    const data = await json<{ rules_json: string; selected_ids_json: string }>(res)
    return {
      rules: parseCategoryAccommodationRulesJson(data.rules_json ?? '[]'),
      selectedIds: parseListingAccommodationRuleIdsJson(data.selected_ids_json ?? '[]'),
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
      { next: { revalidate: 120 } },
    )
    if (!res.ok) return []
    const data = await json<{ days: ListingAvailabilityDay[] }>(res)
    return data.days ?? []
  } catch {
    return []
  }
}

/** Yaklaşık 18 ay; API yok veya hata → boş dizi (tüm günler seçilebilir varsayılır) */
export async function fetchPublicListingAvailabilityDaysSafe(
  listingId: string | null | undefined,
): Promise<ListingAvailabilityDay[]> {
  if (!listingId?.trim()) return []
  const from = new Date()
  from.setHours(0, 0, 0, 0)
  const to = new Date(from)
  to.setMonth(to.getMonth() + 18)
  return getPublicListingAvailabilityCalendar(listingId.trim(), {
    from: formatLocalYmd(from),
    to: formatLocalYmd(to),
  })
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

export type AuthUser = { id: string; email: string; display_name: string | null }

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

export async function getAuthMe(
  token: string,
): Promise<
  AuthUser & { preferred_locale: string; roles: RoleAssignment[]; permissions: string[] }
> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(`auth_me_${res.status}`)
  return json(res)
}

export async function patchAuthMe(
  token: string,
  body: { display_name: string; preferred_locale: string },
): Promise<
  AuthUser & { preferred_locale: string; roles: RoleAssignment[]; permissions: string[] }
> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/auth/me`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
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

export type SocialShareJob = {
  id: string
  entity_type: string
  entity_id: string
  template_id: string | null
  status: string
  caption_ai_generated: string | null
  image_keys: string[]
  created_at: string
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

export async function createSocialJob(
  token: string,
  body: {
    entity_type: string
    entity_id: string
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

/** Bölge slider'ı (SectionSliderRegions) — backend henüz yoksa veya hata varsa [] */
export type PublicRegionStatItem = {
  name: string
  slug: string
  count: number
  thumbnail: string
}

/**
 * GET /api/v1/catalog/public/region-stats?category_code=&limit=
 * Beklenen gövde: `{ regions: { name, slug, count, thumbnail }[] }`
 */
export async function getPublicRegionStats(
  categoryCode: string,
  limit: number,
  init?: RequestInit,
): Promise<PublicRegionStatItem[]> {
  const b = base()
  if (!b) return []
  try {
    const q = new URLSearchParams()
    q.set('category_code', categoryCode)
    q.set('limit', String(limit))
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

export type LocationCountry = { id: string; iso2: string; name: string }

export async function listLocationCountries(): Promise<{ countries: LocationCountry[] }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/locations/countries`)
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
}

export async function listLocationRegions(countryId: string): Promise<{ regions: LocationRegion[] }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const q = new URLSearchParams({ country_id: countryId })
  const res = await fetch(`${b}/api/v1/locations/regions?${q}`)
  if (!res.ok) throw new Error(`locations_regions_${res.status}`)
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

export async function listLocationDistricts(regionId: string): Promise<{ districts: LocationDistrict[] }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const q = new URLSearchParams({ region_id: regionId })
  const res = await fetch(`${b}/api/v1/locations/districts?${q}`)
  if (!res.ok) throw new Error(`locations_districts_${res.status}`)
  return json(res)
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
  map_zoom: number
  is_published: boolean
  region_type: 'country' | 'province' | 'district' | 'destination'
  featured_image_url: string | null
  hero_image_url: string | null
  travel_ideas_image_url: string | null
  travel_ideas_json: string
  translations_json: string
  poi_manual_json: string
  country_info_json: string
}

export type TravelIdea = {
  id: string
  image: string
  title: string
  link: string
  summary: string
}

export type ManualPoi = {
  id: string
  category: string
  name: string
  distance_km: number
  lat?: number | null
  lng?: number | null
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
}

export async function listLocationPages(districtId?: string): Promise<{ pages: LocationPage[] }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const q = new URLSearchParams()
  if (districtId != null && districtId !== '') q.set('district_id', districtId)
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
      next: { revalidate: 60 },
    })
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
    if (!res.ok) return null
    return json(res)
  } catch {
    return null
  }
}

export async function getLocationPage(pageId: string): Promise<LocationPage> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/locations/pages/${encodeURIComponent(pageId)}`)
  if (!res.ok) throw new Error(`locations_page_${res.status}`)
  return json(res)
}

export async function createLocationPage(body: {
  slug_path: string
  district_id?: string
  hero_image_key?: string
}): Promise<{ id: string }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/locations/pages`, {
    method: 'POST',
    headers: locJson(),
    body: JSON.stringify(body),
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
  listingId: string,
): Promise<{ token: string; url: string }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(
    `${b}/api/v1/catalog/listings/${encodeURIComponent(listingId)}/ical-export-token`,
  )
  if (!res.ok) throw new Error(`ical_export_token_get_${res.status}`)
  return json(res)
}

/**
 * Mevcut export token'ı geçersizleştirip yenisini üretir.
 * Eski URL'i kullanan harici takvimler 404 alır → admin bilinçli rotation.
 */
export async function rotateListingIcalExportToken(
  listingId: string,
): Promise<{ token: string; url: string }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(
    `${b}/api/v1/catalog/listings/${encodeURIComponent(listingId)}/ical-export-token`,
    { method: 'POST', headers: locJson() },
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
  )
  if (!res.ok) throw new Error(`vertical_meta_${res.status}`)
  return json(res) as Promise<T>
}

export async function putVerticalMeta<T = Record<string, unknown>>(
  token: string,
  listingId: string,
  category: string,
  data: T,
): Promise<{ ok: boolean }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(v(listingId, '/vertical-meta'), {
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
  featured_image_url: string | null
  thumbnail_url: string | null
  price_from: string | null
  /** Bölge / şehir */
  location: string | null
  /** Harita — API’den (Gleam public search); yoksa mock koordinat veya pinsız */
  map_lat?: string | number | null
  map_lng?: string | number | null
  review_avg: number | null
  review_count?: number
  is_new?: boolean
  discount_percent: number | null
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
  bath_count?: string | null
  /** Görünen ilan tipi (ör. Villa, Dubleks) */
  property_type?: string | null
  /** Virgülle tema kodları (listing_holiday_home_details.theme_codes) */
  theme_codes?: string | null
  /** Otel — vitrin `hotel_type` kodu (kategori tema öğeleri ile eşleştirilir) */
  hotel_type_code?: string | null
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
  /** Hasar depozitosu — `listings.first_charge_amount` */
  first_charge_amount?: string | null
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
): Promise<PublicListingSearchResult | null> {
  const b = base()
  if (!b) return null

  const u = new URLSearchParams()
  if (params.q?.trim())            u.set('q', params.q.trim())
  if (params.categoryCode?.trim()) u.set('category_code', params.categoryCode.trim())
  if (params.location?.trim())     u.set('location', params.location.trim())
  if (params.checkin?.trim())      u.set('checkin', params.checkin.trim())
  if (params.checkout?.trim())     u.set('checkout', params.checkout.trim())
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

  try {
    const res = await fetch(
      `${b}/api/v1/catalog/public/listings${u.toString() ? `?${u.toString()}` : ''}`,
      { next: { revalidate: 60 } },
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
  // Sosyal & AI
  share_to_social?: boolean
  allow_ai_caption?: boolean
  allow_sub_min_stay_gap_booking?: boolean
}

export async function patchListingBasics(
  token: string,
  listingId: string,
  body: ListingBasicsPatch,
): Promise<{ ok: boolean }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/catalog/listings/${listingId}/basics`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `listing_basics_patch_${res.status}`)
  }
  return json(res)
}

// ─── Owner Contact GET / PUT ──────────────────────────────────────────────────
export interface ListingOwnerContact {
  contact_name: string | null
  contact_phone: string | null
  contact_email: string | null
}

export async function getListingOwnerContact(
  token: string,
  listingId: string,
): Promise<ListingOwnerContact> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/catalog/listings/${listingId}/owner-contact`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(`owner_contact_get_${res.status}`)
  return json(res)
}

export async function putListingOwnerContact(
  token: string,
  listingId: string,
  body: { contact_name?: string; contact_phone?: string; contact_email?: string },
): Promise<{ ok: boolean }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/catalog/listings/${listingId}/owner-contact`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  })
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
}

export async function getListingMeta(
  token: string,
  listingId: string,
): Promise<ListingMeta> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/catalog/listings/${listingId}/meta`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(`listing_meta_get_${res.status}`)
  return json(res)
}

export async function putListingMeta(
  token: string,
  listingId: string,
  body: ListingMeta,
): Promise<{ ok: boolean }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/catalog/listings/${listingId}/meta`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  })
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
): Promise<{ item_ids: string[] }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/catalog/listings/${encodeURIComponent(listingId)}/price-line-selections`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(`price_line_sel_get_${res.status}`)
  return json(res)
}

export async function putListingPriceLineSelections(
  token: string,
  listingId: string,
  body: { item_ids: string[] },
): Promise<{ ok: boolean }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(
    `${b}/api/v1/catalog/listings/${encodeURIComponent(listingId)}/price-line-selections`,
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
): Promise<{ ok: boolean }> {
  const b = base()
  if (!b) throw new Error('NEXT_PUBLIC_API_URL_missing')
  const res = await fetch(`${b}/api/v1/catalog/listings/${listingId}/attribute-values`, {
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
