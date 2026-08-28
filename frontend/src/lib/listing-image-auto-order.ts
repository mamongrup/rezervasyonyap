import type { ListingImage } from '@/lib/travel-api'

export type ListingImageAiAnalysis = {
  scene_code: string
  hero_score?: number
  confidence?: number
}

const SCENE_PRIORITY: Record<string, number> = {
  exterior: 100,
  pool: 96,
  sea_view: 94,
  terrace: 90,
  garden: 86,
  living: 78,
  kitchen: 70,
  dining: 68,
  bedroom: 58,
  spa: 42,
  sauna: 38,
  hammam: 38,
  bathroom: 22,
  detail: 10,
  unspecified: 4,
}

const HERO_SCENE_ORDER = [
  'exterior',
  'pool',
  'sea_view',
  'terrace',
  'garden',
  'living',
  'kitchen',
  'dining',
  'bedroom',
  'spa',
  'sauna',
  'hammam',
  'bathroom',
  'detail',
  'unspecified',
] as const

const COVER_EXCLUDED_SCENES = new Set(['bathroom', 'spa', 'sauna', 'hammam', 'detail', 'unspecified'])

function clampScore(value: number | undefined): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 50
  return Math.max(0, Math.min(100, Math.round(value)))
}

function normalizedScene(value: string | null | undefined): string {
  const scene = (value ?? '').trim().toLowerCase()
  return Object.prototype.hasOwnProperty.call(SCENE_PRIORITY, scene) ? scene : 'unspecified'
}

function numericFileIndex(storageKey: string): number {
  const filename = storageKey.split('/').pop() ?? storageKey
  const match = /(?:^|\D)(\d+)(?:-img)?\.[a-z0-9]+$/i.exec(filename)
  return match ? Number.parseInt(match[1]!, 10) : Number.MAX_SAFE_INTEGER
}

/**
 * AI sahne ve kalite puanını galeri sırasına dönüştürür.
 * İlk beş görsel mümkün olduğunca farklı sahnelerden seçilir; banyo/spa/detay fotoğrafları,
 * temsil gücü yüksek bir dış/ortak alan varken kapak olamaz.
 */
export function autoOrderListingImages(
  images: ListingImage[],
  analyses: ReadonlyMap<string, ListingImageAiAnalysis> = new Map()
): ListingImage[] {
  if (images.length < 2) return [...images]

  const enriched = images.map((image) => {
    const analysis = analyses.get(image.id)
    const scene = normalizedScene(analysis?.scene_code ?? image.scene_code)
    const heroScore = clampScore(analysis?.hero_score)
    return {
      image: { ...image, scene_code: scene },
      scene,
      heroScore,
      rank: (SCENE_PRIORITY[scene] ?? 0) + heroScore,
      fileIndex: numericFileIndex(image.storage_key),
    }
  })

  const compare = (a: (typeof enriched)[number], b: (typeof enriched)[number]) =>
    b.rank - a.rank ||
    b.heroScore - a.heroScore ||
    a.fileIndex - b.fileIndex ||
    a.image.sort_order - b.image.sort_order ||
    a.image.storage_key.localeCompare(b.image.storage_key)

  const eligibleCover = enriched.filter((item) => !COVER_EXCLUDED_SCENES.has(item.scene))
  const cover = [...(eligibleCover.length > 0 ? eligibleCover : enriched)].sort(compare)[0]!
  const selected = [cover]
  const used = new Set([cover.image.id])
  const usedScenes = new Set([cover.scene])

  while (selected.length < 5) {
    const candidate = enriched
      .filter((item) => !used.has(item.image.id) && !usedScenes.has(item.scene))
      .sort(compare)[0]
    if (!candidate) break
    selected.push(candidate)
    used.add(candidate.image.id)
    usedScenes.add(candidate.scene)
  }

  if (selected.length < 5) {
    for (const candidate of [...enriched].sort(compare)) {
      if (selected.length >= 5) break
      if (used.has(candidate.image.id)) continue
      selected.push(candidate)
      used.add(candidate.image.id)
    }
  }

  const rest = enriched
    .filter((item) => !used.has(item.image.id))
    .sort((a, b) => {
      const sceneDiff =
        HERO_SCENE_ORDER.indexOf(a.scene as (typeof HERO_SCENE_ORDER)[number]) -
        HERO_SCENE_ORDER.indexOf(b.scene as (typeof HERO_SCENE_ORDER)[number])
      return sceneDiff || compare(a, b)
    })

  return [...selected, ...rest].map((item, sortOrder) => ({
    ...item.image,
    sort_order: sortOrder,
  }))
}
