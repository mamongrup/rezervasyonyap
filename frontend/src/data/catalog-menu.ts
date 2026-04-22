import { DEFAULT_CATALOG_MENU_STRUCTURE, normalizeCatalogMenuIconKey } from '@/lib/catalog-menu-defaults'
import type { CatalogMenuResolvedItem, CatalogMenuStoredEntry } from '@/types/catalog-menu'
import { getMessages } from '@/utils/getT'

function isCatalogStoredEntry(x: unknown): x is CatalogMenuStoredEntry {
  if (x === null || typeof x !== 'object') return false
  const o = x as Record<string, unknown>
  return typeof o.id === 'string' && typeof o.href === 'string' && typeof o.icon === 'string'
}

function resolveRowsFromConfig(raw: unknown): CatalogMenuStoredEntry[] | null {
  if (!Array.isArray(raw) || raw.length === 0) return null
  const parsed = raw.filter(isCatalogStoredEntry).map((row) => ({
    id: row.id,
    href: row.href,
    icon: normalizeCatalogMenuIconKey(row.icon),
  }))
  return parsed.length > 0 ? parsed : null
}

/**
 * Header “Katalog” menüsü — yapı `catalog_menu`, metinler `getMessages(locale).navMenus.catalogMenu`.
 */
export async function getCatalogMenuForLocale(locale: string): Promise<CatalogMenuResolvedItem[]> {
  const m = getMessages(locale)
  const copy = m.navMenus.catalogMenu.items as Record<string, { title: string; description: string }>

  let rows: CatalogMenuStoredEntry[] = DEFAULT_CATALOG_MENU_STRUCTURE
  try {
    const { getCachedSiteConfig } = await import('@/lib/site-config-cache')
    const cfg = await getCachedSiteConfig()
    const parsed = resolveRowsFromConfig((cfg as Record<string, unknown> | null)?.catalog_menu)
    if (parsed) rows = parsed
  } catch {
    /* varsayılan */
  }

  return rows.map((row) => {
    const t = copy[row.id]
    return {
      ...row,
      title: t?.title ?? row.id,
      description: t?.description ?? '',
    }
  })
}
