/**
 * Kategori slider / grid kartları — slug başına tekil, tematik görsel.
 * Dosyalar: `public/uploads/general/hero/{slug}-card.avif`
 * Üretim: `npm run seed:category-thumbnails` (frontend/)
 */

import seedMeta from '../../scripts/category-thumbnail-seed.json'

export const CATEGORY_CARD_UPLOAD_BASENAME = '-card.avif'

export function categoryCardUploadPath(slug: string): string {
  return `/uploads/general/hero/${slug}${CATEGORY_CARD_UPLOAD_BASENAME}`
}

/** Seed kaynakları — `scripts/category-thumbnail-seed.json` ile senkron. */
export const CATEGORY_CARD_SEED_SOURCES: Record<
  string,
  { url: string; objectPosition?: string }
> = seedMeta

export function defaultCategoryCardThumbnailsRecord(): Record<string, { src: string; objectPosition?: string }> {
  const out: Record<string, { src: string; objectPosition?: string }> = {}
  for (const [slug, meta] of Object.entries(CATEGORY_CARD_SEED_SOURCES)) {
    out[slug] = {
      src: categoryCardUploadPath(slug),
      ...(meta.objectPosition ? { objectPosition: meta.objectPosition } : {}),
    }
  }
  return out
}
