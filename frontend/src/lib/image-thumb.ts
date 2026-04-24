/**
 * `/uploads/external/<hash>.avif` yolundaki görselin yanındaki
 * `/uploads/external/<hash>-thumb.avif` (256×256 cover crop) varyantına çevirir.
 *
 * Migration script (scripts/migrate-external-images.mjs, THUMB_SIZE=256)
 * her external AVIF için bu küçük kare varyantı otomatik üretir.
 *
 * Kategori kartları (~96px daire), avatar listeleri, vb. 1600px AVIF yerine
 * 256px kare AVIF yüklesin diye `next/image` `src` bu helper'dan geçirilir.
 *
 * Kural: Sadece `/uploads/external/` alanındaki `.avif` dosyaları için çalışır.
 * Başka bir prefix veya uzantı ise input aynen döner (dış URL'ler, statik importlar
 * veya `-thumb` zaten varsa sonsuz suffix'e düşmeyiz).
 */
export function toExternalThumb(src: string): string {
  if (!src) return src
  if (!src.startsWith('/uploads/external/')) return src
  if (!src.endsWith('.avif')) return src
  if (src.endsWith('-thumb.avif')) return src
  return src.slice(0, -'.avif'.length) + '-thumb.avif'
}
