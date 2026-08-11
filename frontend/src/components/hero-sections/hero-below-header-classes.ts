/**
 * Header ile hero bloğu arası — anasayfa, kategori vitrinleri, bölge sayfası ortak değeri.
 * Tek yerden güncellenir.
 */
export const heroContainerBelowHeaderClassName = 'pt-3 sm:pt-4 lg:pt-5'

/**
 * Mozaik / freeform hero sarmalayıcısı.
 * Mobilde kolaj taşmasını kırpar; lg+ overflow görünür (bleed + arama arkası fon).
 * `overflow-x-clip` tek başına overflow-y’yi de auto yapıp altı keser — kullanma.
 */
export const heroMosaicShellClassName =
  'relative z-0 min-w-0 max-lg:overflow-hidden lg:overflow-visible'

/** Ana sayfa, kategori ve bolge hero'larinda ortak genislik ve dis bosluk. */
export const heroContainerFrameClassName =
  `container mb-6 ${heroContainerBelowHeaderClassName}`

/** Tum ana vitrin hero'larinda ayni grid, kolon orani ve yukseklik davranisi. */
export const heroSizingTopSpacing = 'minimal' as const

/**
 * Hero mozaiği taşması — altındaki gövde blokları (alt kategori, arama sonuçları, page builder)
 * hero katmanının üstünde kalmalı.
 */
export const heroBelowContentClassName = 'relative z-20'
