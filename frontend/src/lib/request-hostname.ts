import { headers } from 'next/headers'

/** İstek `Host` / `X-Forwarded-Host` (ilk değer, port yok). Yalnızca sunucu bileşenleri. */
export async function getRequestHostname(): Promise<string> {
  try {
    const h = await headers()
    const raw = h.get('x-forwarded-host') ?? h.get('host') ?? ''
    return raw.split(',')[0].trim().split(':')[0]
  } catch {
    return ''
  }
}
