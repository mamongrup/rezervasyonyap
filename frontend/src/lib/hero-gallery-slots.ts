import { parseFreeformDoc, type FreeformBannerDocV2 } from '@/lib/freeform-banner-spec'
import {
  DEFAULT_REGION_HERO_FREEFORM,
  REGION_HERO_FREEFORM_FALLBACK_BY_SLUG,
} from '@/lib/region-hero-freeform-defaults'

/**
 * Bölge / hero — `images` dizisi `[0],[1],[2]`:
 * - **Serbest banner (`layout` + `slotIndex`)**: URL hangi kutuda görünür `slotIndex` ile belirlenir.
 *   Varsayılan freeform yerleşimde (`region-hero-freeform-defaults`) slot **0** = sağ uzun sütun,
 *   **1** = sol üst, **2** = sol alt (panel etiketleri buna göre).
 * - **Sadece mozaik (`HeroImageMosaic` region bleed)**: `[0]` sol üst, `[1]` sol alt, `[2]` sağ uzun.
 *
 * Dizi asla `filter` ile kısaltılmaz; API bazen string JSON, bazen parse dizi döndürebilir.
 */
export function normalizeHeroGalleryThree(raw: unknown): [string, string, string] {
  const empty: [string, string, string] = ['', '', '']
  if (raw == null) return empty

  let arr: unknown[] = []
  if (Array.isArray(raw)) {
    arr = raw
  } else if (typeof raw === 'string') {
    const s = raw.trim()
    if (s === '') return empty
    try {
      const p = JSON.parse(s) as unknown
      arr = Array.isArray(p) ? p : []
    } catch {
      return empty
    }
  } else {
    return empty
  }

  const slot = (i: number): string => {
    if (i >= arr.length) return ''
    const v = arr[i]
    if (typeof v === 'string') return v.trim()
    if (v == null) return ''
    return String(v).trim()
  }

  return [slot(0), slot(1), slot(2)]
}

/**
 * `gallery_json` — ya `[url,url,url]` ya da `{ images: [...], layout: FreeformBannerDocV2 }` (banner düzen motoru).
 */
export function parseGalleryBundle(raw: unknown): {
  urls: [string, string, string]
  layout: FreeformBannerDocV2 | null
} {
  const empty: [string, string, string] = ['', '', '']
  if (raw == null) return { urls: empty, layout: null }

  if (typeof raw === 'string') {
    const s = raw.trim()
    if (s === '') return { urls: empty, layout: null }
    try {
      let parsed: unknown = JSON.parse(s)
      if (typeof parsed === 'string') {
        parsed = JSON.parse(parsed)
      }
      return parseGalleryBundle(parsed)
    } catch {
      return { urls: empty, layout: null }
    }
  }

  if (Array.isArray(raw)) {
    return { urls: normalizeHeroGalleryThree(raw), layout: null }
  }

  if (typeof raw === 'object') {
    const o = raw as Record<string, unknown>
    if (Array.isArray(o.images)) {
      const urls = normalizeHeroGalleryThree(o.images)
      let layoutRaw: unknown = o.layout
      if (typeof layoutRaw === 'string') {
        try {
          layoutRaw = JSON.parse(layoutRaw)
        } catch {
          layoutRaw = null
        }
      }
      const layout = layoutRaw != null ? parseFreeformDoc(layoutRaw) : null
      return { urls, layout }
    }
    /** Sadece freeform dokümanı (version + layers) — sarmalayıcı `{ images, layout }` yoksa */
    const layoutOnly = parseFreeformDoc(raw)
    if (layoutOnly) {
      const urls: [string, string, string] = ['', '', '']
      for (let i = 0; i < layoutOnly.layers.length; i++) {
        const layer = layoutOnly.layers[i]
        const si = layer.slotIndex
        const idx =
          typeof si === 'number' && Number.isFinite(si) ? Math.min(2, Math.max(0, Math.round(si))) : i
        const src = (layer.src ?? '').trim()
        if (idx >= 0 && idx <= 2 && src) urls[idx] = src
      }
      return { urls, layout: layoutOnly }
    }
  }

  return { urls: empty, layout: null }
}

/** Üst düzey JSON `["url",…]` veya string olarak `"[...]"` — `{ images, layout }` değil */
export function isLegacyHeroGalleryJson(raw: unknown): boolean {
  if (Array.isArray(raw)) return true
  if (typeof raw !== 'string') return false
  const t = raw.trim()
  if (!t.startsWith('[')) return false
  try {
    return Array.isArray(JSON.parse(t))
  } catch {
    return false
  }
}

/**
 * `parseGalleryBundle` + slug için kod içi yedek yerleşim.
 * Kayıtlı geçerli `layout` varsa o kullanılır.
 * `layout` yok ama en az bir URL varsa: `{ images: [...] }` veya düz dizi — her durumda freeform şablonu eklenir
 * (aksi halde önyüz mozaik grid’e düşer ve JSON’daki yerleşimle eşleşmez).
 */
export function resolveGalleryBundleForSlug(
  slugPath: string,
  raw: unknown,
): { urls: [string, string, string]; layout: FreeformBannerDocV2 | null } {
  const p = parseGalleryBundle(raw)
  if (p.layout) return p
  const fb =
    REGION_HERO_FREEFORM_FALLBACK_BY_SLUG[slugPath] ?? DEFAULT_REGION_HERO_FREEFORM
  const hasUrl = !!(p.urls[0] || p.urls[1] || p.urls[2])
  if (hasUrl) {
    return { urls: p.urls, layout: fb }
  }
  return p
}
