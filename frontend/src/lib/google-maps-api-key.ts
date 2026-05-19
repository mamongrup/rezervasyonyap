import { apiOriginForFetch } from '@/lib/api-origin'

/**
 * Google Maps anahtarı çözümleme sırası:
 * 1) İstek gövdesi / çağıranın verdiği anahtar
 * 2) Yönetim → Genel ayarlar / Yapay zeka → `platform.maps` (public-config)
 * 3) GOOGLE_MAPS_API_KEY / NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
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
