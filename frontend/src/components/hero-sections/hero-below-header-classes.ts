/**
 * Header ile hero bloğu arası — anasayfa, kategori vitrinleri, bölge sayfası ortak değeri.
 * Tek yerden güncellenir.
 */
export const heroContainerBelowHeaderClassName = 'pt-3 sm:pt-4 lg:pt-5'

/**
 * Mozaik / freeform hero sarmalayıcısı.
 * Mobilde kolaj taşmasını kırpar; `z-0` ile alt gövde (`heroBelowContentClassName`) üstte kalır.
 */
export const heroMosaicShellClassName =
  'relative z-0 min-w-0 max-lg:overflow-hidden overflow-x-clip'

/**
 * Hero mozaiği taşması — altındaki gövde blokları (alt kategori, arama sonuçları, page builder)
 * hero katmanının üstünde kalmalı.
 */
export const heroBelowContentClassName = 'relative z-20'
