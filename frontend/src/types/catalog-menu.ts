/** Header “Katalog” menüsü — metinler `navMenus.catalogMenu` (dil dosyaları), yapı `catalog_menu` site ayarı */

export type CatalogMenuIconKey =
  | 'house'
  | 'anchor'
  | 'car'
  | 'hot_air_balloon'
  | 'boat'
  | 'compass'
  | 'airplane'
  | 'map_pinpoint'

/** Site ayarında saklanan satır (çoklu dil metni yok) */
export type CatalogMenuStoredEntry = {
  id: string
  href: string
  icon: CatalogMenuIconKey | string
}

/** Vitrinde gösterilen satır */
export type CatalogMenuResolvedItem = CatalogMenuStoredEntry & {
  title: string
  description: string
}
