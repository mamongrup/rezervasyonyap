/** Panel listing_api_providers — boş gizli alanlar DB'deki değeri silmesin */

export type WtatilSettings = {
  enabled: boolean
  base_url: string
  application_secret_key: string
  username: string
  password: string
  agency_id: string
  listing_status: 'draft' | 'published'
}

export type TravelrobotSettings = {
  enabled: boolean
  /** Canlı Booking API (CreateToken, arama, rezervasyon). */
  base_url: string
  channel_code: string
  channel_password: string
  /** Statik içerik API (otel kodları, destinasyonlar, zenginleştirme). */
  static_base_url: string
  static_user: string
  static_password: string
  listing_status: 'draft' | 'published'
  import_tours: boolean
  import_hotels: boolean
  import_flights: boolean
  import_car_rental: boolean
  /** Otel vitrininde oda kartları için otel bazlı SearchHotel (import yavaşlar). */
  import_hotel_rooms: boolean
}

export type TurnaSettings = {
  enabled: boolean
  base_url: string
  api_key: string
  country_code: string
  currency_code: string
  language_code: string
}

export type Yolcu360Settings = {
  enabled: boolean
  base_url: string
  api_key: string
  api_secret: string
  listing_status: 'draft' | 'published'
}

export type ListingApiProvidersSettings = {
  wtatil: WtatilSettings
  travelrobot: TravelrobotSettings
  turna: TurnaSettings
  yolcu360: Yolcu360Settings
}

function preserveString(form: string, stored: string | undefined): string {
  if (form.trim() !== '') return form
  return stored?.trim() ? stored : form
}

export function mergeListingApiProvidersForSave(
  form: ListingApiProvidersSettings,
  stored: ListingApiProvidersSettings | null | undefined,
): ListingApiProvidersSettings {
  const prev = stored
  return {
    wtatil: {
      ...form.wtatil,
      application_secret_key: preserveString(
        form.wtatil.application_secret_key,
        prev?.wtatil.application_secret_key,
      ),
      password: preserveString(form.wtatil.password, prev?.wtatil.password),
      username: preserveString(form.wtatil.username, prev?.wtatil.username),
      agency_id: preserveString(form.wtatil.agency_id, prev?.wtatil.agency_id),
      base_url: preserveString(form.wtatil.base_url, prev?.wtatil.base_url),
    },
    travelrobot: {
      ...form.travelrobot,
      channel_code: preserveString(form.travelrobot.channel_code, prev?.travelrobot.channel_code),
      channel_password: preserveString(
        form.travelrobot.channel_password,
        prev?.travelrobot.channel_password,
      ),
      base_url: preserveString(form.travelrobot.base_url, prev?.travelrobot.base_url),
      static_user: preserveString(form.travelrobot.static_user, prev?.travelrobot.static_user),
      static_password: preserveString(
        form.travelrobot.static_password,
        prev?.travelrobot.static_password,
      ),
      static_base_url: preserveString(
        form.travelrobot.static_base_url,
        prev?.travelrobot.static_base_url,
      ),
    },
    turna: {
      ...form.turna,
      api_key: preserveString(form.turna.api_key, prev?.turna.api_key),
      base_url: preserveString(form.turna.base_url, prev?.turna.base_url),
    },
    yolcu360: {
      ...form.yolcu360,
      api_key: preserveString(form.yolcu360.api_key, prev?.yolcu360.api_key),
      api_secret: preserveString(form.yolcu360.api_secret, prev?.yolcu360.api_secret),
      base_url: preserveString(form.yolcu360.base_url, prev?.yolcu360.base_url),
    },
  }
}

export function parseListingApiProvidersValue(
  valueJson: unknown,
): Partial<ListingApiProvidersSettings> | null {
  if (!valueJson) return null
  try {
    const v = typeof valueJson === 'string' ? JSON.parse(valueJson) : valueJson
    return v && typeof v === 'object' ? (v as Partial<ListingApiProvidersSettings>) : null
  } catch {
    return null
  }
}
