import { hostApexKey, SAME_DEPLOYMENT_SITE_APEXES } from '@/lib/api-origin'

export type BrandSiteRole = 'primary_tr' | 'brand_tr' | 'international'

export type BrandSite = {
  apex: (typeof SAME_DEPLOYMENT_SITE_APEXES)[number]
  origin: string
  role: BrandSiteRole
  /** Footer / schema görünen ad */
  label: { tr: string; en: string }
}

/** Üç marka domaini — crawlable çapraz link + sameAs için tek kaynak. */
export const BRAND_SITES: readonly BrandSite[] = [
  {
    apex: 'rezervasyonyap.tr',
    origin: 'https://rezervasyonyap.tr',
    role: 'primary_tr',
    label: { tr: 'RezervasyonYap.tr', en: 'RezervasyonYap.tr' },
  },
  {
    apex: 'rezervasyonyap.com.tr',
    origin: 'https://rezervasyonyap.com.tr',
    role: 'brand_tr',
    label: { tr: 'RezervasyonYap.com.tr', en: 'RezervasyonYap.com.tr' },
  },
  {
    apex: 'reservationinturkey.com',
    origin: 'https://reservationinturkey.com',
    role: 'international',
    label: { tr: 'Reservation in Turkey', en: 'Reservation in Turkey' },
  },
] as const

/** Host’a göre farklı title/description — üç sitenin Google’da ayrı marka sinyali. */
export const DEFAULT_DOMAIN_SEO: Record<
  string,
  { site_name: string; site_description: string }
> = {
  'rezervasyonyap.tr': {
    site_name: 'Rezervasyon Yap',
    site_description:
      'Otel, tur, tatil evi, yat, araç kiralama ve transfer rezervasyonu. Yurtiçi ve yurtdışı tatil için güvenilir acente.',
  },
  'rezervasyonyap.com.tr': {
    site_name: 'Rezervasyon Yap',
    site_description:
      'Türkiye’de otel, tur ve tatil rezervasyonu — RezervasyonYap.com.tr ile uygun fiyatlı konaklama ve gezi seçenekleri.',
  },
  'reservationinturkey.com': {
    site_name: 'Reservation in Turkey',
    site_description:
      'Book hotels, tours, holiday homes, yacht charters and car rental across Turkey. Trusted travel agency for your Turkey trip.',
  },
}

export function brandSitesExcludingHost(hostname: string): BrandSite[] {
  const apex = hostApexKey(hostname.split(':')[0] ?? '')
  return BRAND_SITES.filter((s) => s.apex !== apex)
}

export function allBrandSiteOrigins(): string[] {
  return BRAND_SITES.map((s) => s.origin)
}

export function brandSiteLabel(site: BrandSite, locale: string): string {
  return locale.toLowerCase().startsWith('en') ? site.label.en : site.label.tr
}
