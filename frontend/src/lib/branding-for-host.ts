import { hostApexKey, SAME_DEPLOYMENT_SITE_APEXES } from '@/lib/api-origin'

/** Domain başına logo + SEO override alanları (`branding.domain_overrides[apex]`). */
export type BrandingDomainLogoOverride = {
  logo_text_line1?: string
  logo_text_line2?: string
  logo_text_line1_color?: string
  logo_text_line2_color?: string
  site_name?: string
  site_description?: string
}

const LOGO_TEXT_KEYS = [
  'logo_text_line1',
  'logo_text_line2',
  'logo_text_line1_color',
  'logo_text_line2_color',
  'site_name',
  'site_description',
] as const

export type BrandingLogoTextKey = (typeof LOGO_TEXT_KEYS)[number]

/** Panelde düzenlenebilir bağlı apex listesi. */
export const BRANDING_DOMAIN_APEXES: readonly string[] = SAME_DEPLOYMENT_SITE_APEXES

/**
 * `branding.domain_overrides` içinden istek host'una göre logo metin/renk alanlarını uygular.
 * Boş override değeri → varsayılan (kök branding) kullanılır.
 * `domain_overrides` nesnesi korunur (panel yeniden kaydı için).
 */
export function applyBrandingDomainOverrides<T extends Record<string, unknown>>(
  branding: T | null | undefined,
  hostname: string,
): T {
  if (!branding) return {} as T
  const apex = hostApexKey(hostname.split(':')[0] ?? '')
  if (!apex || !BRANDING_DOMAIN_APEXES.includes(apex)) return branding

  const rawOverrides = branding.domain_overrides
  if (!rawOverrides || typeof rawOverrides !== 'object' || Array.isArray(rawOverrides)) {
    return branding
  }

  const perHost = (rawOverrides as Record<string, unknown>)[apex]
  if (!perHost || typeof perHost !== 'object' || Array.isArray(perHost)) {
    return branding
  }

  const next: Record<string, unknown> = { ...branding }
  const o = perHost as Record<string, unknown>
  for (const key of LOGO_TEXT_KEYS) {
    const v = o[key]
    if (typeof v === 'string' && v.trim()) {
      next[key] = v.trim()
    }
  }
  return next as T
}

/** Panel kaydı: boş alanları ve boş domain girdilerini temizle. */
export function sanitizeDomainOverrides(
  raw: Record<string, BrandingDomainLogoOverride> | null | undefined,
): Record<string, BrandingDomainLogoOverride> {
  if (!raw || typeof raw !== 'object') return {}
  const out: Record<string, BrandingDomainLogoOverride> = {}
  for (const [apexKey, entry] of Object.entries(raw)) {
    const apex = hostApexKey(apexKey)
    if (!apex || !BRANDING_DOMAIN_APEXES.includes(apex) || !entry || typeof entry !== 'object') continue
    const cleaned: BrandingDomainLogoOverride = {}
    for (const key of LOGO_TEXT_KEYS) {
      const v = entry[key]
      if (typeof v === 'string' && v.trim()) cleaned[key] = v.trim()
    }
    if (Object.keys(cleaned).length > 0) out[apex] = cleaned
  }
  return out
}

export function parseDomainOverrides(branding: Record<string, unknown>): Record<string, BrandingDomainLogoOverride> {
  const raw = branding.domain_overrides
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  const out: Record<string, BrandingDomainLogoOverride> = {}
  for (const [apexKey, entry] of Object.entries(raw as Record<string, unknown>)) {
    const apex = hostApexKey(apexKey)
    if (
      !apex ||
      !BRANDING_DOMAIN_APEXES.includes(apex) ||
      !entry ||
      typeof entry !== 'object' ||
      Array.isArray(entry)
    ) {
      continue
    }
    const e = entry as Record<string, unknown>
    const cleaned: BrandingDomainLogoOverride = {}
    for (const key of LOGO_TEXT_KEYS) {
      if (typeof e[key] === 'string') cleaned[key] = e[key] as string
    }
    out[apex] = cleaned
  }
  return out
}
