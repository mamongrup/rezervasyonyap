/**
 * Kategori kart görselleri — JSON / page-builder içinde string veya { src, objectPosition }.
 */

export type CategoryThumbnailNormalized = {
  src: string
  objectPosition: string
}

/** Güvenli object-position (CSS injection önleme). */
export function sanitizeObjectPosition(raw: string | undefined): string {
  const t = (raw ?? '').trim().slice(0, 48)
  if (!t) return '50% 50%'
  if (/^[0-9.%degfpx\s,-]+$/i.test(t)) return t
  return '50% 50%'
}

export function parseCategoryThumbnailEntry(raw: unknown): CategoryThumbnailNormalized | null {
  if (typeof raw === 'string') {
    const s = raw.trim()
    return s ? { src: s, objectPosition: '50% 50%' } : null
  }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const o = raw as Record<string, unknown>
  const srcRaw = typeof o.src === 'string' ? o.src : typeof o.url === 'string' ? (o.url as string) : ''
  const src = srcRaw.trim()
  if (!src) return null
  const objectPosition = sanitizeObjectPosition(
    typeof o.objectPosition === 'string'
      ? o.objectPosition
      : typeof o.position === 'string'
        ? o.position
        : undefined,
  )
  return { src, objectPosition }
}

export function recordToNormalizedThumbnails(record: Record<string, unknown>): Record<string, CategoryThumbnailNormalized> {
  const out: Record<string, CategoryThumbnailNormalized> = {}
  for (const [k, v] of Object.entries(record)) {
    const key = k.trim()
    if (!key) continue
    const p = parseCategoryThumbnailEntry(v)
    if (p) out[key] = p
  }
  return out
}

/** Varsayılan odakta dosyayı küçük tutmak için yalnızca URL string saklanır. */
export function serializeThumbnailForStorage(entry: CategoryThumbnailNormalized): string | CategoryThumbnailNormalized {
  const pos = entry.objectPosition.trim()
  if (pos === '50% 50%' || pos === '50%') return entry.src.trim()
  return { src: entry.src.trim(), objectPosition: pos }
}

export type RawThumbnailMap = Record<string, unknown>

export function mergeRawThumbnailMaps(...layers: RawThumbnailMap[]): RawThumbnailMap {
  return layers.reduce<RawThumbnailMap>((acc, layer) => ({ ...acc, ...layer }), {})
}

const clampPct = (n: number) => Math.min(100, Math.max(0, n))

/** Kart düzeni için odak yüzdeleri → CSS object-position */
export function focalPercentsToObjectPosition(x: number, y: number): string {
  return `${clampPct(Math.round(x * 10) / 10)}% ${clampPct(Math.round(y * 10) / 10)}%`
}

/** "45% 30%" veya tek eksen "50%" → x,y yüzdeleri */
export function objectPositionToFocalPercents(pos: string): { x: number; y: number } {
  const t = pos.trim()
  if (!t) return { x: 50, y: 50 }
  const parts = t.split(/\s+/).filter(Boolean)
  const px = parseFloat(parts[0]?.replace('%', '') ?? '50')
  const pyRaw = parts[1]?.replace('%', '')
  const py = pyRaw !== undefined ? parseFloat(pyRaw) : px
  return {
    x: clampPct(Number.isFinite(px) ? px : 50),
    y: clampPct(Number.isFinite(py) ? py : 50),
  }
}
