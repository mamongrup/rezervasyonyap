import { LOCALIZED_ROUTES_STATIC_FALLBACK } from '@/data/localized-routes-fallback'
import { CATEGORY_REGISTRY } from '@/data/category-registry'
import { buildLocalizedRouteIndexes } from '@/lib/localized-path-shared'

const CATEGORY_SLUGS = new Set(CATEGORY_REGISTRY.map((category) => category.slug))
const CATEGORY_ROUTE_ROWS = LOCALIZED_ROUTES_STATIC_FALLBACK.filter((row) =>
  CATEGORY_SLUGS.has(row.logical_key) || CATEGORY_SLUGS.has(row.logical_key.replace(/-harita$/, '')),
)
const CATEGORY_ROUTE_INDEXES = buildLocalizedRouteIndexes(CATEGORY_ROUTE_ROWS)

/** Vitrin URL'sinin ilk segmentini ortak iç kategori yoluna çevirir. */
export function canonicalCategoryRestPath(restPath: string): string {
  const raw = (restPath.split('?')[0] ?? restPath).trim() || '/'
  const parts = raw.split('/').filter(Boolean)
  if (!parts.length) return '/'

  const normalized = parts[0]!.toLowerCase()
  let logical = parts[0]!
  if (!CATEGORY_SLUGS.has(logical)) for (const reverse of Object.values(CATEGORY_ROUTE_INDEXES.reverse)) {
    const match = reverse[normalized]
    if (match) {
      logical = match
      break
    }
  }

  return `/${[logical, ...parts.slice(1)].join('/')}`
}
