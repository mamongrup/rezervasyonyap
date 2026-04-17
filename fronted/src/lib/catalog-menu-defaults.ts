import type { CatalogMenuStoredEntry } from '@/types/catalog-menu'

const VALID_ICONS = new Set<string>([
  'house',
  'anchor',
  'car',
  'hot_air_balloon',
  'boat',
  'compass',
  'airplane',
  'map_pinpoint',
])

/** Bilinmeyen ikon anahtarını güvenli varsayılanla değiştirir */
export function normalizeCatalogMenuIconKey(icon: string): string {
  return VALID_ICONS.has(icon) ? icon : 'house'
}

/** Varsayılan sıra ve yollar — başlıklar dil dosyalarında `navMenus.catalogMenu.items[id]` */
export const DEFAULT_CATALOG_MENU_STRUCTURE: CatalogMenuStoredEntry[] = [
  { id: '1', icon: 'house', href: '/oteller/all' },
  { id: '2', icon: 'anchor', href: '/yat-kiralama/all' },
  { id: '3', icon: 'car', href: '/arac-kiralama/all' },
  { id: '4', icon: 'hot_air_balloon', href: '/turlar/all' },
  { id: '5', icon: 'boat', href: '/kruvaziyer/all' },
  { id: '6', icon: 'boat', href: '/feribot/all' },
  { id: '7', icon: 'compass', href: '/transfer/all' },
  { id: '8', icon: 'airplane', href: '/ucak-bileti/all' },
  { id: '9', icon: 'map_pinpoint', href: '/vize/all' },
  { id: '10', icon: 'map_pinpoint', href: '/hac-umre/all' },
]

export const KNOWN_CATALOG_ITEM_IDS = DEFAULT_CATALOG_MENU_STRUCTURE.map((r) => r.id)
