/**
 * `public/region-places/{slug}.json` dosya adlarıyla uyumlu bölge slug'ı.
 * Sokak adresi kullanmayın — şehir / bölge adı kullanın.
 */
export function regionPlacesSlugFromCity(city: string | undefined | null): string | undefined {
  if (!city?.trim()) return undefined
  const t = city
    .trim()
    .replace(/İ/g, 'i')
    .replace(/I/g, 'i')
    .replace(/ı/g, 'i')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
  return t.length ? t : undefined
}
