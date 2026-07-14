import { fallbackLocaleCodes } from '@/lib/i18n-config'

export const LOCALE_PREFERENCE_COOKIE = 'travel_locale_preference'

const SUPPORTED_LOCALES = new Set<string>(fallbackLocaleCodes)
const DEFAULT_INTERNATIONAL_HOSTS = new Set([
  'reservationinturkey.com',
  'www.reservationinturkey.com',
])

function normalizeHost(host: string): string {
  const value = host.trim().toLowerCase()
  const withoutPort = value.replace(/:\d+$/, '')
  return withoutPort.startsWith('www.') ? withoutPort.slice(4) : withoutPort
}

function supportedLocale(raw: string | null | undefined): string | null {
  if (!raw) return null
  const base = raw.trim().toLowerCase().split('-')[0] ?? ''
  return SUPPORTED_LOCALES.has(base) ? base : null
}

export function isInternationalSiteHost(host: string, configuredHosts = ''): boolean {
  const normalized = normalizeHost(host)
  if (!normalized) return false

  const hosts = new Set(DEFAULT_INTERNATIONAL_HOSTS)
  for (const item of configuredHosts.split(',')) {
    const configured = normalizeHost(item)
    if (configured) hosts.add(configured)
  }

  for (const candidate of hosts) {
    if (normalizeHost(candidate) === normalized) return true
  }
  return false
}

export function localeFromAcceptLanguage(header: string | null): string | null {
  if (!header) return null
  const ranked = header
    .split(',')
    .map((part, index) => {
      const [tagPart, ...params] = part.trim().split(';')
      const qParam = params.find((param) => param.trim().toLowerCase().startsWith('q='))
      const parsedQ = qParam ? Number.parseFloat(qParam.split('=')[1] ?? '') : 1
      return {
        locale: supportedLocale(tagPart),
        quality: Number.isFinite(parsedQ) ? parsedQ : 0,
        index,
      }
    })
    .filter((item) => item.locale && item.quality > 0)
    .sort((a, b) => b.quality - a.quality || a.index - b.index)

  return ranked[0]?.locale ?? null
}

export function localeFromCountry(country: string | null): string | null {
  switch (country?.trim().toUpperCase()) {
    case 'TR':
      return 'tr'
    case 'RU':
      return 'ru'
    case 'CN':
    case 'SG':
      return 'zh'
    case 'DE':
    case 'AT':
      return 'de'
    case 'FR':
      return 'fr'
    default:
      return null
  }
}

export function countryFromRequestHeaders(headers: Pick<Headers, 'get'>): string | null {
  for (const name of [
    'cf-ipcountry',
    'x-vercel-ip-country',
    'cloudfront-viewer-country',
    'x-country-code',
    'x-geo-country',
  ]) {
    const value = headers.get(name)?.trim()
    if (value && value !== 'XX') return value
  }
  return null
}

export function resolveInternationalLocale(input: {
  preferredLocale?: string | null
  acceptLanguage?: string | null
  country?: string | null
  userAgent?: string | null
}): string {
  const preferred = supportedLocale(input.preferredLocale)
  if (preferred) return preferred

  // Arama motorlarına kararlı bir İngilizce başlangıç adresi verilir.
  if (/bot|crawler|spider|slurp|bingpreview/i.test(input.userAgent ?? '')) return 'en'

  return (
    localeFromAcceptLanguage(input.acceptLanguage ?? null) ??
    localeFromCountry(input.country ?? null) ??
    'en'
  )
}
