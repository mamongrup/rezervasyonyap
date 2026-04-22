import {
  Airplane02Icon,
  AnchorIcon,
  BoatIcon,
  Car03Icon,
  Compass01Icon,
  HotAirBalloonIcon,
  House04Icon,
  MapPinpoint02Icon,
} from '@hugeicons/core-free-icons'
import type { CatalogMenuIconKey } from '@/types/catalog-menu'

export const CATALOG_MENU_ICON_MAP = {
  house: House04Icon,
  anchor: AnchorIcon,
  car: Car03Icon,
  hot_air_balloon: HotAirBalloonIcon,
  boat: BoatIcon,
  compass: Compass01Icon,
  airplane: Airplane02Icon,
  map_pinpoint: MapPinpoint02Icon,
} as const satisfies Record<CatalogMenuIconKey, (typeof House04Icon)>

export const CATALOG_MENU_ICON_OPTIONS: { key: CatalogMenuIconKey; label: string }[] = [
  { key: 'house', label: 'Konaklama / ev' },
  { key: 'anchor', label: 'Çapa (yat)' },
  { key: 'car', label: 'Araç' },
  { key: 'hot_air_balloon', label: 'Balon (tur)' },
  { key: 'boat', label: 'Tekne / feribot' },
  { key: 'compass', label: 'Pusula (transfer)' },
  { key: 'airplane', label: 'Uçak' },
  { key: 'map_pinpoint', label: 'Harita / konum' },
]

export function resolveCatalogMenuIcon(key: string): (typeof CATALOG_MENU_ICON_MAP)[CatalogMenuIconKey] {
  if (key in CATALOG_MENU_ICON_MAP) {
    return CATALOG_MENU_ICON_MAP[key as CatalogMenuIconKey]
  }
  return CATALOG_MENU_ICON_MAP.house
}
