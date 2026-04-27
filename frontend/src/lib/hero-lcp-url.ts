import type { FreeformBannerDocV2 } from '@/lib/freeform-banner-spec'

/**
 * `HeroImageMosaic` ve `FreeformBannerView` ile aynı mantık — LCP görseli hangi URL ise
 * `preload(..., fetchPriority: 'high')` sırasında ilk sırada olmalı (keşif gecikmesi düşer).
 */
export function resolveHeroLcpImageUrl(
  freeformDoc: FreeformBannerDocV2 | null | undefined,
  mosaicThree: readonly [string, string, string],
): string | undefined {
  const imageUrls = mosaicThree

  if (freeformDoc?.layers?.length) {
    const layers = freeformDoc.layers
    const firstIdx = layers.findIndex((layer, i) => {
      const si = layer.slotIndex
      const urlIdx =
        typeof si === 'number' && Number.isFinite(si) ? Math.min(2, Math.max(0, Math.round(si))) : i
      const u = (imageUrls[urlIdx] ?? layer.src ?? '').trim()
      return u !== ''
    })
    if (firstIdx < 0) return undefined
    const layer = layers[firstIdx]
    const si = layer.slotIndex
    const urlIdx =
      typeof si === 'number' && Number.isFinite(si)
        ? Math.min(2, Math.max(0, Math.round(si)))
        : firstIdx
    const s = (imageUrls[urlIdx] ?? layer.src ?? '').trim()
    return s || undefined
  }

  const mosaicIdx = [0, 1, 2].find((i) => imageUrls[i]?.trim() !== '')
  if (mosaicIdx === undefined) return undefined
  const s = imageUrls[mosaicIdx].trim()
  return s || undefined
}
