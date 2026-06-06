import type { CategoryRegistryEntry } from '@/data/category-registry'
import { getMessages } from '@/utils/getT'

type RegistryRow = {
  name?: string
  namePlural?: string
  heroHeading?: string
  heroSubheading?: string
  priceUnit?: string
}

/** Kategori registry kaydını vitrin locale metinleriyle zenginleştirir. */
export function resolveCategoryDisplay(
  category: CategoryRegistryEntry,
  locale: string,
): CategoryRegistryEntry {
  const registry = getMessages(locale).categoryPage.registry as
    | Record<string, RegistryRow>
    | undefined
  const row = registry?.[category.slug]
  if (!row) return category
  return {
    ...category,
    name: row.name?.trim() || category.name,
    namePlural: row.namePlural?.trim() || category.namePlural,
    heroHeading: row.heroHeading?.trim() || category.heroHeading,
    heroSubheading: row.heroSubheading?.trim() || category.heroSubheading,
    priceUnit: row.priceUnit?.trim() || category.priceUnit,
  }
}
