import { panelImagesToFreeformUrls } from '@/lib/hero-gallery-slots'
import type { FreeformBannerDocV2 } from '@/lib/freeform-banner-spec'
import { DEFAULT_REGION_HERO_FREEFORM } from '@/lib/region-hero-freeform-defaults'
import FreeformBannerView from './FreeformBannerView'

type Props = {
  /** Panel sırası: [0] sol üst, [1] sol alt, [2] sağ uzun (anasayfa / kategori hero ile aynı) */
  panelImages: [string, string, string]
  alt: string
  /** Özel freeform yerleşim; yoksa bölge varsayılanı */
  layout?: FreeformBannerDocV2
  className?: string
}

/**
 * Tüm vitrin hero kolajları — mobil ve masaüstünde aynı freeform geometri (dar ekranda küçülür).
 */
export default function RegionHeroCollage({
  panelImages,
  alt,
  layout = DEFAULT_REGION_HERO_FREEFORM,
  className,
}: Props) {
  if (!panelImages.some((u) => u.trim())) return null

  return (
    <FreeformBannerView
      doc={layout}
      imageUrls={panelImagesToFreeformUrls(panelImages)}
      alt={alt}
      className={className}
    />
  )
}
