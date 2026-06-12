import { resolveYachtLocationPin } from '@/lib/yacht-location-resolve'

/** Marina / adres satırından kategori pazarlama eklerini temizle (ör. "Fethiye Yat Kiralama" → "Fethiye"). */
export function stripStayLocationMarketingSuffix(segment: string): string {
  let s = String(segment ?? '').trim()
  if (!s) return ''
  s = s.replace(/\s+yat\s+kiralama\b/gi, '')
  s = s.replace(/\s+tatil\s+evi\b/gi, '')
  s = s.replace(/\s+yacht\s+charter\b/gi, '')
  s = s.replace(/\s+yat\s+charter\b/gi, '')
  return s.replace(/\s{2,}/g, ' ').trim()
}

function titleCaseTrWord(word: string): string {
  if (!word) return ''
  const lower = word.toLocaleLowerCase('tr')
  return lower.charAt(0).toLocaleUpperCase('tr') + lower.slice(1)
}

/** URL bölge anahtarı → vitrin etiketi (ör. `mugla/fethiye` → `Fethiye`). */
export function regionLabelFromHandle(handle: string | undefined | null): string | undefined {
  const raw = String(handle ?? '').trim()
  if (!raw || raw === 'all') return undefined
  const last = raw.split('/').filter(Boolean).pop() ?? raw
  const spaced = last.replace(/-/g, ' ')
  const cleaned = stripStayLocationMarketingSuffix(spaced)
  if (!cleaned) return undefined
  return cleaned
    .split(/\s+/)
    .filter(Boolean)
    .map(titleCaseTrWord)
    .join(' ')
}

export type ListingLocationHierarchy = {
  /** Bölge / semt — `listing_meta.district_label` */
  area?: string | null
  /** İlçe — `listing_meta.city` */
  district?: string | null
  /** İl — `listing_meta.province_city` */
  province?: string | null
}

function trimLocationPart(value: string | null | undefined): string {
  return String(value ?? '').trim()
}

/** Vitrin başlığı altı — «bölge, ilçe, il» sırası. */
export function formatListingLocationHierarchy(parts: ListingLocationHierarchy): string {
  const candidates = [
    trimLocationPart(parts.area),
    trimLocationPart(parts.district),
    trimLocationPart(parts.province),
  ].filter(Boolean)
  if (!candidates.length) return ''
  const deduped: string[] = []
  for (const part of candidates) {
    if (!deduped.some((existing) => existing.toLocaleLowerCase('tr') === part.toLocaleLowerCase('tr'))) {
      deduped.push(part)
    }
  }
  return deduped.join(', ')
}

/** Kart / detay konum satırı — virgülle ayrılmış parçaları sadeleştirir. */
export function normalizeStayLocationPin(raw: string | null | undefined): string {
  const text = String(raw ?? '').trim()
  if (!text) return ''
  const resolved = resolveYachtLocationPin(text)
  if (resolved.includes(',')) return resolved
  const parts = text
    .split(',')
    .map((segment) => segment.trim())
    .filter(Boolean)
    .map((segment) => segment.replace(/\b\d{4,6}\b/g, '').replace(/\s{2,}/g, ' ').trim())
    .flatMap((segment) => segment.split('/').map((piece) => piece.trim()).filter(Boolean))
    .map(stripStayLocationMarketingSuffix)
    .filter(Boolean)
  if (!parts.length) return ''
  const deduped: string[] = []
  for (const part of parts) {
    if (!deduped.some((x) => x.toLocaleLowerCase('tr') === part.toLocaleLowerCase('tr'))) {
      deduped.push(part)
    }
  }
  return deduped.join(', ')
}
