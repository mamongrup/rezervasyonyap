/**
 * Vitrin (ilk hücreler): her sahneden en az bir görsel, sonra kalanlar yüklenme sırasına göre.
 * Tema bileşenlerine dokunmadan sadece `images[]` sırasını üretmek için.
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

/** Depo anahtarı → tarayıcıda kullanılan URL */
export function storageKeyToPublicUrl(storageKey: string): string {
  const k = storageKey.trim()
  if (!k) return ''
  if (k.startsWith('http://') || k.startsWith('https://') || k.startsWith('/')) return k
  return `/${k}`
}

export type ImageRowForHero = {
  storage_key: string
  sort_order: number
  scene_code: string | null
}

/**
 * Önce her kategoriden (sıra önceliğine göre) bir görsel; kalanlar sort_order ile.
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
