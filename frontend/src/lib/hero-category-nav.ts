/**
 * Hero kategori çubuğu — yalnızca ilanı olan kategoriler + gerçek kart görselleri.
 */
import { CATEGORY_REGISTRY } from '@/data/category-registry'
import { getTravelCategories } from '@/data/categories'
import { getSharedTravelCategoryThumbnails } from '@/data/page-builder-config'
import { normalizeSiteRelativeUploadSrc } from '@/lib/normalize-site-upload-src'
import { siteUploadBrowserHref } from '@/lib/site-upload-browser-href'

export type HeroCategoryNavItem = {
  slug: string
  imageSrc: string
  objectPosition?: string
}

/** Katalog dışı arama dikeyleri — ilan sayısı 0 olsa da hero'da kalsın. */
const ALWAYS_INCLUDE_SLUGS = new Set(['ucak-bileti', 'arac-kiralama'])

const FALLBACK_PHOTO: Record<string, string> = {
  oteller: '/page-builder/category-photos/oteller.webp',
  'tatil-evleri': '/page-builder/category-photos/tatil-evleri.webp',
  'yat-kiralama': '/page-builder/category-photos/yat-kiralama.webp',
  turlar: '/page-builder/category-photos/turlar.webp',
  aktiviteler: '/page-builder/category-photos/aktiviteler.webp',
  kruvaziyer: '/page-builder/category-photos/kruvaziyer.webp',
  'hac-umre': '/page-builder/category-photos/hac-umre.webp',
  vize: '/page-builder/category-photos/vize.webp',
  'ucak-bileti': '/page-builder/category-photos/ucak-bileti.webp',
  'arac-kiralama': '/page-builder/category-photos/arac-kiralama.webp',
  feribot: '/page-builder/category-photos/feribot.webp',
  transfer: '/page-builder/category-photos/transfer.webp',
}

function resolveImageSrc(
  slug: string,
  shared: Awaited<ReturnType<typeof getSharedTravelCategoryThumbnails>>,
  categoryThumbnail?: string,
): { src: string; objectPosition?: string } {
  const fromShared = shared[slug]
  const raw =
    fromShared?.src?.trim() ||
    categoryThumbnail?.trim() ||
    FALLBACK_PHOTO[slug] ||
    ''
  const src = siteUploadBrowserHref(normalizeSiteRelativeUploadSrc(raw))
  return {
    src: src || FALLBACK_PHOTO[slug] || '',
    objectPosition: fromShared?.objectPosition,
  }
}

/**
 * İlanı > 0 olan kategoriler (sıra: yönetim home sırası / navOrder).
 * Uçak ve araç araması ilansız olsa da eklenir.
 */
export async function getHeroCategoryNavItems(): Promise<HeroCategoryNavItem[]> {
  const [categories, shared] = await Promise.all([
    getTravelCategories(),
    getSharedTravelCategoryThumbnails(),
  ])

  const withListings = categories.filter((c) => (c.count ?? 0) > 0)
  const seen = new Set(withListings.map((c) => c.handle))
  const extras = categories.filter(
    (c) => ALWAYS_INCLUDE_SLUGS.has(c.handle) && !seen.has(c.handle),
  )
  const picked = [...withListings, ...extras]

  // Stats yoksa: showInNav + foto (boş çubuk olmasın)
  const source =
    picked.length > 0
      ? picked
      : CATEGORY_REGISTRY.filter((c) => c.showInNav).map((reg) => ({
          handle: reg.slug,
          thumbnail: FALLBACK_PHOTO[reg.slug] ?? '',
        }))

  return source
    .map((c) => {
      const slug = c.handle
      const { src, objectPosition } = resolveImageSrc(slug, shared, c.thumbnail)
      if (!src) return null
      return {
        slug,
        imageSrc: src,
        ...(objectPosition ? { objectPosition } : {}),
      } satisfies HeroCategoryNavItem
    })
    .filter((x): x is HeroCategoryNavItem => x != null)
}

export function heroCategoryNavToActiveSlugs(items: HeroCategoryNavItem[]): string[] {
  return items.map((i) => i.slug)
}

export function heroCategoryNavToImageMap(
  items: HeroCategoryNavItem[],
): Record<string, { src: string; objectPosition?: string }> {
  const out: Record<string, { src: string; objectPosition?: string }> = {}
  for (const item of items) {
    out[item.slug] = {
      src: item.imageSrc,
      ...(item.objectPosition ? { objectPosition: item.objectPosition } : {}),
    }
  }
  return out
}
