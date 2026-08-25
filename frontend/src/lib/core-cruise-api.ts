/**
 * Core Cruise Engine Partner API client.
 *
 * Keep the bearer token server-side. Never expose it through a NEXT_PUBLIC_* variable.
 * Contract: https://mamon.b2b.corecruise.ai/docs/api#/
 */

export const CORE_CRUISE_DEFAULT_BASE_URL = 'https://mamon.b2b.corecruise.ai/api/partner'

export type CoreCruiseScalar = string | number | boolean | null
export type CoreCruiseJson = CoreCruiseScalar | CoreCruiseJson[] | { [key: string]: CoreCruiseJson }

export type PaymentMethod =
  'credit_card' | 'wire_transfer' | 'paypal' | 'bank_transfer' | 'credit_line' | 'cash' | 'other' | 'cari'
export type PassengerTitle = 'mr' | 'mrs' | 'ms' | 'miss' | 'dr' | 'prof'
export type PassengerGender = 'male' | 'female'
export type BookingStatus = 'draft' | 'held' | 'pending_payment' | 'confirmed' | 'cancelled' | 'failed' | 'expired'
export type WebhookEvent =
  'booking.created' | 'booking.held' | 'booking.confirmed' | 'booking.cancelled' | 'passengers.updated' | 'hold.expired'

export interface Money {
  amount: number
  currency: string
}

export interface CursorPagination {
  per_page: number
  next_cursor: string | null
  prev_cursor: string | null
  has_more: boolean
}

export interface CursorPage<T> {
  data: T[]
  pagination: CursorPagination
}

export interface CruiseSummary {
  id: string
  package_id: string
  provider_code: string
  sailing_id: string | null
  name: string
  cruise_line: { code: string; name: string }
  ship: { code: string; name: string }
  region: { code: string | null; name: string }
  departure_port: { code: string; name: string }
  departure_date: string
  arrival_date: string
  nights: number
  ports: CoreCruiseJson[]
  price_from: Money
  promo: { id: string | null; name: string | null } | null
  image_url: string | null
  has_availability: boolean
  categories_count: number | null
}

export interface CruiseDetail extends CruiseSummary {
  description: string | null
  highlights: string | string[]
  itinerary: string[]
  itinerary_map: null | CoreCruiseJson
  categories: CoreCruiseJson[]
  ship: CruiseSummary['ship'] & {
    description: string | null
    highlights: string | string[]
    hero_image: string | null
    gallery: string | string[]
    facts: string | string[]
  }
}

export interface CruiseSearchParams {
  destination?: string
  departure_port?: string
  departure_from?: string
  departure_to?: string
  ship_code?: string
  package_id?: string
  cruise_line?: string
  min_nights?: number
  max_nights?: number
  min_price?: number
  max_price?: number
  adults?: number
  children?: number
  sort_by?: 'departure_date' | 'price' | 'nights'
  sort_order?: 'asc' | 'desc'
  cursor?: string
  per_page?: number
  grouped?: boolean
}

export interface OccupancyParams {
  adults: number
  children?: number
  infants?: number
  ages?: number[]
  promo_id?: string
  include_guest_prices?: boolean
}

export interface CruiseAvailability {
  data: CoreCruiseJson[]
  provider_code: string
  sailing_id: string | null
  query: { cruise_id: string; adults: number; children: number; infants: number }
}

export interface CruiseCabins extends CruiseAvailability {
  price_breakdown: null | {
    total: Money
    guest_prices: Array<{
      guest_index: string
      guest_type: string
      cruise_fare: number
      port_taxes: number
      service_fees: number
      total: number
    }>
  }
  hold_context: {
    package_id: string
    ship_code: string
    departure_date: string
    category_code: string
    provider_code: string
    sailing_id: string | null
    promo_id: string | null
  }
}

export interface PackageSearchParams {
  destination?: string
  departure_port?: string
  departure_from?: string
  departure_to?: string
  cruise_line?: string
  ship_code?: string
  min_nights?: number
  max_nights?: number
  min_price?: number
  max_price?: number
  sort_by?: 'departure_date' | 'price' | 'nights'
  sort_order?: 'asc' | 'desc'
  cursor?: string
  per_page?: number
}

export type CruisePackage = Record<string, CoreCruiseJson>
export interface PackageAvailability {
  data: CoreCruiseJson[]
  provider_code: string
  sailing_id: string
  hold_context: { date_card_id: string }
  query: { date_card_id: string; adults: number; children: number; infants: number }
}

export interface CreateCruiseHoldRequest {
  package_id: string
  ship_code: string
  departure_date: string
  category_code: string
  guest_count: number
  cabin_number?: string
  provider_code?: string
  sailing_id?: string
  promo_id?: string
  ages?: number[]
}

export interface CreatePackageHoldRequest {
  date_card_id: string
  category_code: string
  guest_count: number
  cabin_number?: string
}

export type CreateHoldRequest = CreateCruiseHoldRequest | CreatePackageHoldRequest
export interface HoldResource {
  id: string
  provider_hold_id: string | null
  is_internal_hold: boolean
  status: string
  expires_at: string
  remaining_seconds: string
  package_id: string
  ship_code: string
  departure_date: string
  category_code: string
  cabin_number: string
  guest_count: number
  price: { total: number; currency: string | null } | null
  released_at: string
  converted_at: string
  created_at: string
}

export interface Passenger {
  title: PassengerTitle
  first_name: string
  last_name: string
  gender: PassengerGender
  date_of_birth: string
  nationality: string
  email?: string | null
  phone?: string | null
  id_number?: string | null
  passport_number?: string | null
  passport_expiry?: string | null
  passport_country?: string | null
  loyalty_number?: string | null
  dining_option?: string | null
  guest_type?: 'adult' | 'child' | 'infant'
}

export interface CreateBookingRequest {
  hold_id: string
  payment_method: PaymentMethod
  contact: { name: string; email: string; phone: string }
  passengers: Passenger[]
  promo_code?: string | null
  deposit_option?: string | null
  dining_option?: string | null
}

export type BookingResource = Record<string, CoreCruiseJson> & {
  id: string
  booking_number: string
  status: string
}

export interface BookingSearchParams {
  status?: BookingStatus
  departure_from?: string
  departure_to?: string
  created_from?: string
  created_to?: string
  cursor?: string
  limit?: number
}

export interface MeResource {
  user: { id: number; name: string; email: string }
  agency: { id: string; code: string; name: string; api_access_tiers: CoreCruiseJson[] }
  token: { id: string | null; name: string | null; abilities: string | string[]; last_used_at: string | null }
}

export interface PartnerWebhookResource {
  id: string
  name: string | null
  url: string
  events: WebhookEvent[]
  is_active: boolean
  created_at: string
  updated_at: string
  /** Returned in plaintext only by the create operation. */
  secret: string
}

export interface CoreCruiseClientOptions {
  token: string
  baseUrl?: string
  fetch?: typeof globalThis.fetch
  timeoutMs?: number
  maxRetries?: number
}

export class CoreCruiseApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body: unknown,
    readonly retryAfterSeconds: number | null
  ) {
    super(message)
    this.name = 'CoreCruiseApiError'
  }
}

function queryString<T extends object>(values: T): string {
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(values as Record<string, unknown>)) {
    if (value === undefined || value === null || value === '') continue
    if (Array.isArray(value)) {
      for (const item of value) query.append(key, String(item))
    } else if (typeof value === 'boolean') {
      query.set(key, value ? 'true' : 'false')
    } else {
      query.set(key, String(value))
    }
  }
  const rendered = query.toString()
  return rendered ? `?${rendered}` : ''
}

function idempotencyKey(): string {
  return globalThis.crypto.randomUUID()
}

export class CoreCruiseClient {
  private readonly baseUrl: string
  private readonly fetcher: typeof globalThis.fetch
  private readonly timeoutMs: number
  private readonly maxRetries: number

  constructor(private readonly options: CoreCruiseClientOptions) {
    if (!options.token.trim()) throw new Error('CORE_CRUISE_API_TOKEN_missing')
    this.baseUrl = (options.baseUrl ?? CORE_CRUISE_DEFAULT_BASE_URL).replace(/\/$/, '')
    this.fetcher = options.fetch ?? globalThis.fetch
    this.timeoutMs = options.timeoutMs ?? 30_000
    this.maxRetries = options.maxRetries ?? 2
  }

  private async request<T>(path: string, init: RequestInit = {}, retry = 0): Promise<T> {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs)
    try {
      const response = await this.fetcher(`${this.baseUrl}${path}`, {
        ...init,
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${this.options.token}`,
          ...(init.body ? { 'Content-Type': 'application/json' } : {}),
          ...init.headers,
        },
        signal: controller.signal,
      })
      const retryAfter = Number(response.headers.get('retry-after'))
      if (response.status === 429 && retry < this.maxRetries) {
        const waitMs = Number.isFinite(retryAfter) ? Math.max(0, retryAfter * 1000) : 1000 * 2 ** retry
        await new Promise((resolve) => setTimeout(resolve, waitMs + Math.random() * 250))
        return this.request<T>(path, init, retry + 1)
      }
      if (response.status === 204) return undefined as T
      const raw = await response.text()
      let body: unknown = null
      if (raw) {
        try {
          body = JSON.parse(raw)
        } catch {
          body = raw
        }
      }
      if (!response.ok) {
        const message =
          body && typeof body === 'object' && 'message' in body
            ? String((body as { message: unknown }).message)
            : `Core Cruise API request failed (${response.status})`
        throw new CoreCruiseApiError(message, response.status, body, Number.isFinite(retryAfter) ? retryAfter : null)
      }
      return body as T
    } finally {
      clearTimeout(timeout)
    }
  }

  private json<T>(path: string, method: string, body?: unknown, key?: string): Promise<T> {
    return this.request<T>(path, {
      method,
      body: body === undefined ? undefined : JSON.stringify(body),
      headers: key ? { 'Idempotency-Key': key } : undefined,
    })
  }

  me = async (): Promise<MeResource> => (await this.request<{ data: MeResource }>('/v1/me')).data

  listCruises = (params: CruiseSearchParams = {}) =>
    this.request<CursorPage<CruiseSummary> | { groups: CoreCruiseJson[]; pagination: CursorPagination }>(
      `/v1/catalog/cruises${queryString(params)}`
    )
  getCruise = async (id: string): Promise<CruiseDetail> =>
    (await this.request<{ data: CruiseDetail }>(`/v1/catalog/cruises/${encodeURIComponent(id)}`)).data
  getCruiseAvailability = (id: string, params: OccupancyParams) =>
    this.request<CruiseAvailability>(
      `/v1/catalog/cruises/${encodeURIComponent(id)}/availability${queryString({ ...params, 'ages[]': params.ages, ages: undefined })}`
    )
  getCruiseCabins = (id: string, categoryCode: string, params: OccupancyParams) =>
    this.request<CruiseCabins>(
      `/v1/catalog/cruises/${encodeURIComponent(id)}/cabins${queryString({ ...params, category_code: categoryCode, 'ages[]': params.ages, ages: undefined })}`
    )

  /** Reads every cursor page. grouped=true is rejected because it has no flat data array. */
  async getAllCruises(params: Omit<CruiseSearchParams, 'cursor' | 'grouped'> = {}): Promise<CruiseSummary[]> {
    const cruises: CruiseSummary[] = []
    let cursor: string | undefined
    do {
      const page = await this.listCruises({ ...params, cursor, per_page: params.per_page ?? 50, grouped: false })
      if (!('data' in page)) throw new Error('CORE_CRUISE_grouped_response_unexpected')
      cruises.push(...page.data)
      cursor = page.pagination.next_cursor ?? undefined
    } while (cursor)
    return cruises
  }

  listPackages = (params: PackageSearchParams = {}) =>
    this.request<CursorPage<CruisePackage>>(`/v1/catalog/packages${queryString(params)}`)
  getPackage = async (id: string): Promise<CruisePackage> =>
    (await this.request<{ data: CruisePackage }>(`/v1/catalog/packages/${encodeURIComponent(id)}`)).data
  getPackageAvailability = (id: string, params: Pick<OccupancyParams, 'adults' | 'children' | 'infants'>) =>
    this.request<PackageAvailability>(
      `/v1/catalog/packages/${encodeURIComponent(id)}/availability${queryString(params)}`
    )

  createHold = async (body: CreateHoldRequest, key = idempotencyKey()): Promise<HoldResource> =>
    (await this.json<{ data: HoldResource }>('/v1/holds', 'POST', body, key)).data
  getHold = async (id: string): Promise<HoldResource> =>
    (await this.request<{ data: HoldResource }>(`/v1/holds/${encodeURIComponent(id)}`)).data
  extendHold = async (id: string, minutes: number, key = idempotencyKey()): Promise<HoldResource> =>
    (await this.json<{ data: HoldResource }>(`/v1/holds/${encodeURIComponent(id)}/extend`, 'POST', { minutes }, key))
      .data
  releaseHold = async (id: string, key = idempotencyKey()): Promise<HoldResource> =>
    (await this.json<{ data: HoldResource }>(`/v1/holds/${encodeURIComponent(id)}/release`, 'POST', {}, key)).data

  listBookings = (params: BookingSearchParams = {}) =>
    this.request<CursorPage<BookingResource>>(`/v1/bookings${queryString(params)}`)
  createBooking = async (body: CreateBookingRequest, key = idempotencyKey()): Promise<BookingResource> =>
    (await this.json<{ data: BookingResource }>('/v1/bookings', 'POST', body, key)).data
  getBooking = async (id: string): Promise<BookingResource> =>
    (await this.request<{ data: BookingResource }>(`/v1/bookings/${encodeURIComponent(id)}`)).data
  replacePassengers = async (id: string, passengers: Passenger[]): Promise<BookingResource> =>
    (
      await this.json<{ data: BookingResource }>(`/v1/bookings/${encodeURIComponent(id)}/passengers`, 'PUT', {
        passengers,
      })
    ).data
  cancelBooking = (
    id: string,
    body: { reason?: string | null; audit_note?: string | null } = {},
    key = idempotencyKey()
  ) => this.json<CoreCruiseJson>(`/v1/bookings/${encodeURIComponent(id)}/cancel`, 'POST', body, key)

  listWebhooks = async (): Promise<PartnerWebhookResource[]> =>
    (await this.request<{ data: PartnerWebhookResource[] }>('/v1/webhooks')).data
  createWebhook = async (body: {
    name?: string | null
    url: string
    events: WebhookEvent[]
  }): Promise<PartnerWebhookResource> =>
    (await this.json<{ data: PartnerWebhookResource }>('/v1/webhooks', 'POST', body)).data
  deleteWebhook = (id: string | number): Promise<void> =>
    this.request<void>(`/v1/webhooks/${encodeURIComponent(String(id))}`, { method: 'DELETE' })
}

export function coreCruiseClientFromEnv(env: NodeJS.ProcessEnv = process.env): CoreCruiseClient {
  return new CoreCruiseClient({
    token: env.CORE_CRUISE_API_TOKEN ?? '',
    baseUrl: env.CORE_CRUISE_API_BASE_URL,
  })
}
