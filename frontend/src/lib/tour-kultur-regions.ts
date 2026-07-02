/** Kültür tur bölge kodları — hub, filtre ve alt kategori rotaları */

export const KULTUR_REGION_CODES = [
  'kapadokya',
  'karadeniz',
  'gap',
  'ege-akdeniz',
  'ic-anadolu',
  'dogu-anadolu',
  'gunubirlik',
  'marmara',
] as const

export type KulturRegionCode = (typeof KULTUR_REGION_CODES)[number]

export const KULTUR_REGION_SLUGS = [
  'kapadokya-turlari',
  'karadeniz-turlari',
  'gap-turlari',
  'ege-akdeniz-turlari',
  'ic-anadolu-turlari',
  'dogu-anadolu-turlari',
  'gunubirlik-turlar',
  'marmara-turlari',
] as const

const SLUG_TO_REGION: Record<string, KulturRegionCode> = {
  'kapadokya-turlari': 'kapadokya',
  'karadeniz-turlari': 'karadeniz',
  'gap-turlari': 'gap',
  'ege-akdeniz-turlari': 'ege-akdeniz',
  'ic-anadolu-turlari': 'ic-anadolu',
  'dogu-anadolu-turlari': 'dogu-anadolu',
  'gunubirlik-turlar': 'gunubirlik',
  'marmara-turlari': 'marmara',
}

const REGION_LABELS_TR: Record<KulturRegionCode, string> = {
  kapadokya: 'Kapadokya',
  karadeniz: 'Karadeniz',
  gap: 'GAP',
  'ege-akdeniz': 'Akdeniz-Ege',
  'ic-anadolu': 'İç Anadolu',
  'dogu-anadolu': 'Doğu Anadolu',
  gunubirlik: 'Günübirlik',
  marmara: 'Marmara',
}

const REGION_LABELS_EN: Record<KulturRegionCode, string> = {
  kapadokya: 'Cappadocia',
  karadeniz: 'Black Sea',
  gap: 'GAP',
  'ege-akdeniz': 'Aegean & Mediterranean',
  'ic-anadolu': 'Central Anatolia',
  'dogu-anadolu': 'Eastern Anatolia',
  gunubirlik: 'Day tours',
  marmara: 'Marmara',
}

export function kulturRegionFromSlug(slug: string): KulturRegionCode | undefined {
  return SLUG_TO_REGION[slug]
}

export function kulturRegionLabel(code: string, locale: string): string {
  const c = code as KulturRegionCode
  const en = locale === 'en' || locale.startsWith('en-')
  if (KULTUR_REGION_CODES.includes(c)) {
    return en ? REGION_LABELS_EN[c] : REGION_LABELS_TR[c]
  }
  return code
}

export function getTourRegionFilterOptions(locale: string): { code: string; label: string }[] {
  const en = locale === 'en' || locale.startsWith('en-')
  return KULTUR_REGION_CODES.map((code) => ({
    code,
    label: en ? REGION_LABELS_EN[code] : REGION_LABELS_TR[code],
  }))
}
