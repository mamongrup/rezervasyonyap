import { apiOriginForFetch } from '@/lib/api-origin'

/**
 * Tarayıcı / Maps JavaScript API anahtarı.
 * HTTP referrer kısıtı olabilir (NEXT_PUBLIC_* veya panel `google_maps_api_key`).
 *
 * Sıra: explicit → platform.maps (public-config) → GOOGLE_MAPS_API_KEY → NEXT_PUBLIC_*
 */
export async function resolveGoogleMapsApiKey(explicit?: string): Promise<string> {
  const fromArg = explicit?.trim()
  if (fromArg) return fromArg

  const apiBase = apiOriginForFetch() || (process.env.API_URL ?? '').replace(/\/$/, '')
  if (apiBase) {
    try {
      const res = await fetch(`${apiBase}/api/v1/site/public-config`, {
        next: { revalidate: 60 },
      })
      if (res.ok) {
        const data = (await res.json()) as { maps?: { google_maps_api_key?: string } }
        const fromSettings = data.maps?.google_maps_api_key?.trim() ?? ''
        if (fromSettings) return fromSettings
      }
    } catch {
      /* upstream yoksa env'e düş */
    }
  }

  return (
    process.env.GOOGLE_MAPS_API_KEY?.trim() ||
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() ||
    ''
  )
}

/**
 * Sunucu tarafı Places / Geocoding / Distance Matrix anahtarı.
 *
 * Bu uçlar Google’a Next sunucusundan gider; HTTP referrer kısıtlı tarayıcı
 * anahtarı REQUEST_DENIED üretir. Bu yüzden NEXT_PUBLIC_* ve public-config
 * tarayıcı anahtarı burada kullanılmaz.
 *
 * Sıra: GOOGLE_MAPS_SERVER_API_KEY → GOOGLE_PLACES_API_KEY → GOOGLE_MAPS_API_KEY
 * (ikincisi yalnızca sunucu EnvironmentFile’da, build’e gömülmeyen anahtar olmalı)
 */
export function resolveGoogleMapsServerApiKey(): string {
  return (
    process.env.GOOGLE_MAPS_SERVER_API_KEY?.trim() ||
    process.env.GOOGLE_PLACES_API_KEY?.trim() ||
    process.env.GOOGLE_MAPS_API_KEY?.trim() ||
    ''
  )
}

export const GOOGLE_MAPS_SERVER_KEY_HELP =
  'Sunucu Places anahtarı eksik veya referrer kısıtlı. /etc/rezervasyonyap/frontend.env içine GOOGLE_MAPS_SERVER_API_KEY ekleyin (Places API + Geocoding açık; Application restriction: None veya sunucu IP). Tarayıcı (HTTP referrer) anahtarı bu API ile kullanılamaz. Sonra travel-web restart.'

/** Google status/error_message → yöneticiye okunur Türkçe açıklama */
export function formatGooglePlacesServerError(status: string, errorMessage?: string): string {
  const msg = (errorMessage ?? '').trim()
  const lower = msg.toLowerCase()
  if (
    status === 'REQUEST_DENIED' &&
    (lower.includes('referer') || lower.includes('referrer'))
  ) {
    return `Google Places hatası: REQUEST_DENIED — ${GOOGLE_MAPS_SERVER_KEY_HELP}`
  }
  if (status === 'REQUEST_DENIED') {
    return `Google Places hatası: REQUEST_DENIED — ${msg || GOOGLE_MAPS_SERVER_KEY_HELP}`
  }
  return `Google Places hatası: ${status}${msg ? ` — ${msg}` : ''}`
}
