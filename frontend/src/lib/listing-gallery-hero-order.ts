/**
 * İlan görselleri sırası: panel `sort_order` (`orderGalleryUrlsBySortOrder`) ve isteğe bağlı
 * sahne kolajı (`orderGalleryUrlsForHero`). Detay hero/share için `galleryUrlsForStayDetailHeader`.
 */

export const LISTING_IMAGE_SCENE_ORDER = [
  'sea_view',
  'pool',
  'living',
  'bedroom',
  'sauna',
  'hammam',
  'bathroom',
  'unspecified',
] as const

export type ListingImageSceneCode = (typeof LISTING_IMAGE_SCENE_ORDER)[number]

function normalizeScene(code: string | null | undefined): ListingImageSceneCode {
  const s = (code ?? '').trim().toLowerCase()
  if (!s) return 'unspecified'
  if ((LISTING_IMAGE_SCENE_ORDER as readonly string[]).includes(s)) return s as ListingImageSceneCode
  return 'unspecified'
}

function hostApexKey(hostname: string): string {
  return hostname.replace(/^www\./i, '').toLowerCase()
}

/**
 * Yerel `next dev` + uzak API: DB `/uploads/...` yolları localhost'ta 404 verir.
 * `NEXT_PUBLIC_UPLOADS_ORIGIN` veya (geliştirmede) `NEXT_PUBLIC_API_URL` origin ile tam URL üretir.
 */
function listingUploadsOrigin(): string {
  const explicit = process.env.NEXT_PUBLIC_UPLOADS_ORIGIN?.trim()
  if (explicit) return explicit.replace(/\/+$/, '')

  const pub = process.env.NEXT_PUBLIC_API_URL?.trim() ?? ''
  if (!/^https?:\/\//i.test(pub)) return ''

  try {
    const apiUrl = new URL(pub)
    const apiHost = hostApexKey(apiUrl.hostname)

    if (typeof window !== 'undefined') {
      const pageHost = hostApexKey(window.location.hostname)
      if (pageHost !== apiHost) return apiUrl.origin
      return ''
    }

    if (process.env.NODE_ENV === 'development') return apiUrl.origin
  } catch {
    return ''
  }
  return ''
}

/** Depo anahtarı → tarayıcıda kullanılan URL */
export function storageKeyToPublicUrl(storageKey: string): string {
  const k = storageKey.trim()
  if (!k) return ''
  if (k.startsWith('http://') || k.startsWith('https://')) return k

  const path = k.startsWith('/') ? k : `/${k}`
  if (path.startsWith('/uploads/')) {
    const origin = listingUploadsOrigin()
    if (origin) return `${origin}${path}`
  }
  return path
}

/** Aynı URL tekrarlarını kaldırır; ilk görünüm sırasını korur (hero grid çift slot önler). */
export function dedupeGalleryUrlsPreserveOrder(urls: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const raw of urls) {
    const u = raw.trim()
    if (!u || seen.has(u)) continue
    seen.add(u)
    out.push(u)
  }
  return out
}

export type ImageRowForHero = {
  storage_key: string
  sort_order: number
  scene_code: string | null
  /** Backend `order by sort_order, created_at` ile uyumlu beraberlik kırılımı */
  created_at?: string
}

/**
 * Panel sırası (`sort_order`, beraberlikte `created_at`) — önyüz ilan detay galerisi.
 */
export function orderGalleryUrlsBySortOrder(rows: ImageRowForHero[]): string[] {
  if (rows.length === 0) return []
  const sorted = [...rows].sort((a, b) => {
    if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order
    const ca = a.created_at ?? ''
    const cb = b.created_at ?? ''
    if (ca !== cb) return ca.localeCompare(cb)
    return a.storage_key.localeCompare(b.storage_key)
  })
  return sorted.map((r) => storageKeyToPublicUrl(r.storage_key)).filter((u) => u.trim() !== '')
}

/**
 * İlan detay hero: önce `galleryImgs` (panel sırası); galeri boşsa kapak (`featuredImage`).
 * Kapak URL'si galeride zaten varsa tekrar başa alınmaz.
 */
export function galleryUrlsForStayDetailHeader(
  featuredImage: string | undefined | null,
  galleryImgs: string[] | undefined | null,
): string[] {
  const trimmed = (galleryImgs ?? []).map((u) => (typeof u === 'string' ? u.trim() : ''))
  const hasAny = trimmed.some(Boolean)
  if (!hasAny) {
    const f = featuredImage?.trim()
    return f ? [f] : []
  }
  /** Boş string'ler korunur (tatil evi hero önizlemesi 5 hücre hizası). */
  return trimmed
}

/**
 * Sahne öncelikli kolaj (deniz → havuz → …); vitrin **detay** sayfasında kullanılmıyor —
 * panel sırası için `orderGalleryUrlsBySortOrder` kullanılır.
 */
export function orderGalleryUrlsForHero(rows: ImageRowForHero[]): string[] {
  if (rows.length === 0) return []
  const sorted = [...rows].sort((a, b) => {
    if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order
    return a.storage_key.localeCompare(b.storage_key)
  })

  const used = new Set<string>()
  const out: string[] = []

  const bucket = new Map<ListingImageSceneCode, ImageRowForHero[]>()
  for (const r of sorted) {
    const k = normalizeScene(r.scene_code)
    const list = bucket.get(k) ?? []
    list.push(r)
    bucket.set(k, list)
  }

  for (const tier of LISTING_IMAGE_SCENE_ORDER) {
    const list = bucket.get(tier)
    const first = list?.[0]
    if (first && !used.has(first.storage_key)) {
      out.push(storageKeyToPublicUrl(first.storage_key))
      used.add(first.storage_key)
    }
  }

  for (const r of sorted) {
    if (!used.has(r.storage_key)) {
      out.push(storageKeyToPublicUrl(r.storage_key))
      used.add(r.storage_key)
    }
  }

  return out
}
