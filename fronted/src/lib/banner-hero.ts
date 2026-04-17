import { getActiveCdn, listBannerPlacementsPublic, type CdnActiveRes } from '@/lib/travel-api'

function cdnUrlForStorageKey(cdn: CdnActiveRes, storageKey: string): string | null {
  const key = storageKey.trim()
  if (key === '') return null
  if (cdn.active === null) return null
  const pull = 'pull_zone_url' in cdn ? cdn.pull_zone_url : null
  if (pull == null || pull === '') return null
  const base = pull.replace(/\/$/, '')
  const path = key.replace(/^\//, '')
  return `${base}/${path.split('/').map(encodeURIComponent).join('/')}`
}

/** Aktif `home_hero` yerleşimi; yoksa sıradaki ilk kayıt. CDN yoksa veya hata olursa `null`. */
export async function getHomeHeroFromBanners(locale: string): Promise<{
  imageSrc: string
  linkUrl: string | null
} | null> {
  try {
    const [placementsRes, cdn] = await Promise.all([
      listBannerPlacementsPublic({ locale: locale.trim() || undefined }),
      getActiveCdn(),
    ])
    const placements = placementsRes.placements
    if (placements.length === 0) return null
    const hero =
      placements.find((p) => p.placement_code === 'home_hero') ?? placements[0]
    const imageSrc = cdnUrlForStorageKey(cdn, hero.image_storage_key)
    if (imageSrc == null) return null
    return { imageSrc, linkUrl: hero.link_url }
  } catch {
    return null
  }
}
