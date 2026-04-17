import { parseFreeformDoc, type FreeformBannerDocV2 } from '@/lib/freeform-banner-spec'

/**
 * `gallery_json` hâlâ eski `[url,url,url]` formatındayken (layout kolonu yok) kullanılacak
 * serbest yerleşim — böylece önyüz `FreeformBannerView` ile aynı tasarımı gösterir.
 * Veritabanında `{ images, layout }` kaydı varsa o her zaman önceliklidir.
 *
 * Katman `slotIndex` ↔ `images[i]`: 0 = sağ uzun, 1 = sol üst, 2 = sol alt (16:9 tuval, yüzde koordinat).
 */
const DEFAULT_REGION_FREEFORM_RAW = {
  version: 2 as const,
  outerAspect: '16/9' as const,
  layers: [
    {
      id: 'layer-mnyl4hly-u9rrv',
      x: 0.7616822429906542,
      y: 0.2507788161993769,
      w: 0.22242990654205608,
      h: 0.694496365524403,
      focusX: 50,
      focusY: 50,
      slotIndex: 0,
    },
    {
      id: 'layer-mnyl4y9o-zdgzn',
      x: 0.5168224299065421,
      y: 0.05804776739356177,
      w: 0.22616822429906536,
      h: 0.31235721703011426,
      focusX: 50,
      focusY: 50,
      slotIndex: 1,
    },
    {
      id: 'layer-mnyl5i2z-q6c54',
      x: 0.5168224299065421,
      y: 0.4036344755970925,
      w: 0.22616822429906536,
      h: 0.461889927310488,
      focusX: 50,
      focusY: 50,
      slotIndex: 2,
    },
  ],
  guides: {
    horizontal: [
      0.05804776739356177,
      0.2507788161993769,
      0.37040498442367603,
      0.4036344755970925,
      0.8655244029075805,
      0.9452751817237799,
    ],
    vertical: [0.5, 0.5168224299065421, 0.7429906542056075, 0.7616822429906542],
  },
}

const defaultLayout = parseFreeformDoc(DEFAULT_REGION_FREEFORM_RAW)
if (!defaultLayout) throw new Error('region-hero-freeform-defaults: default layout invalid')

/** Eski `[url,url,url]` galeride slug’a özel satır yoksa kullanılan yerleşim */
export const DEFAULT_REGION_HERO_FREEFORM: FreeformBannerDocV2 = defaultLayout

/** İsteğe bağlı slug başına aynı veya farklı yedek (şu an hepsi varsayılanla aynı) */
export const REGION_HERO_FREEFORM_FALLBACK_BY_SLUG: Record<string, FreeformBannerDocV2> = {
  turkiye: defaultLayout,
}
