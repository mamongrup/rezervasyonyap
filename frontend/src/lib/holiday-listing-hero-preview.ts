import { dedupeGalleryUrlsPreserveOrder, orderGalleryUrlsBySortOrder, storageKeyToPublicUrl } from '@/lib/listing-gallery-hero-order'
import { preferListingGalleryFullAsset } from '@/lib/listing-gallery-display-url'
import type { ListingImage } from '@/lib/travel-api'

/** Panel önizlemesi + `vertical-meta` ile uyumlu anahtar */
export const MANAGE_HERO_PREVIEW_META_KEY = 'manage_hero_preview_storage_keys'

const SORT_IMAGES = (a: ListingImage, b: ListingImage) =>
  a.sort_order - b.sort_order || String(a.created_at ?? '').localeCompare(String(b.created_at ?? ''))

/** Sahne etiketi “otomatik” sayılmaz */
export function imageHasMeaningfulScene(scene: string | null | undefined): boolean {
  const s = (scene ?? '').trim().toLowerCase()
  return s !== '' && s !== 'unspecified'
}

export function parseHeroPreviewKeysFromVertical(data: Record<string, unknown>): string[] | null {
  const raw = data[MANAGE_HERO_PREVIEW_META_KEY]
  if (!Array.isArray(raw)) return null
  const keys = raw.slice(0, 5).map((x) => (typeof x === 'string' ? x.trim() : ''))
  while (keys.length < 5) keys.push('')
  return keys
}

/** İlk 5 sıralı depolama anahtarı (boş doldurulur). */
export function defaultHeroKeysFromSort(images: ListingImage[]): string[] {
  const sorted = [...images].sort(SORT_IMAGES).map((im) => im.storage_key).filter(Boolean)
  const out = sorted.slice(0, 5)
  while (out.length < 5) out.push('')
  return out
}

/**
 * Etiketli görsellerden vitrin özet sırası:
 * 1 manzara (sea_view) · yoksa ilk havuz
 * 2 havuz (ikinci havuz; manzara yoksa birinci zaten havuz olabilir)
 * 3 salon / oturma (living → “salon & mutfak” panel dilinde)
 * 4 yatak · 5 banyo · kalan boşluklar sırayla doldurulur.
 */
export function pickHeroKeysFromTaggedImages(images: ListingImage[]): string[] {
  const sorted = [...images].sort(SORT_IMAGES)
  const used = new Set<string>()

  const poolKeys = sorted
    .filter((im) => (im.scene_code ?? '').trim() === 'pool')
    .map((im) => im.storage_key)
    .filter(Boolean)
  const seaKeys = sorted
    .filter((im) => (im.scene_code ?? '').trim() === 'sea_view')
    .map((im) => im.storage_key)
    .filter(Boolean)

  let pi = 0
  const slots: (string | null)[] = [null, null, null, null, null]

  if (seaKeys.length > 0 && seaKeys[0]) {
    slots[0] = seaKeys[0]
    used.add(seaKeys[0])
  } else if (poolKeys[pi]) {
    slots[0] = poolKeys[pi]
    used.add(poolKeys[pi]!)
    pi++
  }

  while (pi < poolKeys.length && used.has(poolKeys[pi]!)) pi++
  if (pi < poolKeys.length && poolKeys[pi]) {
    slots[1] = poolKeys[pi]
    used.add(poolKeys[pi]!)
    pi++
  }

  const takeScene = (code: string): string | null => {
    for (const im of sorted) {
      if (used.has(im.storage_key)) continue
      if ((im.scene_code ?? '').trim() === code) {
        used.add(im.storage_key)
        return im.storage_key
      }
    }
    return null
  }

  slots[2] = takeScene('living')
  slots[3] = takeScene('bedroom')
  slots[4] = takeScene('bathroom')

  for (let i = 0; i < 5; i++) {
    if (slots[i]) continue
    for (const im of sorted) {
      if (used.has(im.storage_key)) continue
      used.add(im.storage_key)
      slots[i] = im.storage_key
      break
    }
  }

  return slots.map((s) => s ?? '')
}

/**
 * Tatil evi vitrin detayı: panelde kaydedilen 5 hücre (`storage_key` sırası) ile hero grid
 * hizalanır; ardından kalan görseller `sort_order` ile eklenir. Çift URL'ler ayıklanır.
 */
export function galleryUrlsWithHolidayHeroPreview(
  previewKeysFromMeta: string[] | null | undefined,
  images: ListingImage[],
): string[] {
  const rows = images.map((im) => ({
    storage_key: im.storage_key,
    sort_order: im.sort_order,
    scene_code: im.scene_code ?? null,
    created_at: im.created_at,
  }))
  const baseUrls = dedupeGalleryUrlsPreserveOrder(
    orderGalleryUrlsBySortOrder(rows).map(preferListingGalleryFullAsset),
  )

  const orderedKeys = [...images].sort(SORT_IMAGES)
  const keyToUrl = new Map<string, string>()
  for (const im of orderedKeys) {
    const k = im.storage_key.trim()
    if (!k || keyToUrl.has(k)) continue
    keyToUrl.set(k, preferListingGalleryFullAsset(storageKeyToPublicUrl(im.storage_key)))
  }

  if (!Array.isArray(previewKeysFromMeta)) {
    return baseUrls
  }

  const pad = [...previewKeysFromMeta]
  while (pad.length < 5) pad.push('')
  const trimmedPad = pad.slice(0, 5)

  const used = new Set<string>()
  const leadingFive: string[] = []
  let anyResolved = false
  for (const raw of trimmedPad) {
    const k = typeof raw === 'string' ? raw.trim() : ''
    if (!k) {
      leadingFive.push('')
      continue
    }
    const url = keyToUrl.get(k)
    if (!url || used.has(url)) {
      leadingFive.push('')
      continue
    }
    used.add(url)
    leadingFive.push(url)
    anyResolved = true
  }

  if (!anyResolved) {
    return baseUrls
  }

  const rest = baseUrls.filter((u) => !used.has(u))
  return [...leadingFive, ...rest]
}
