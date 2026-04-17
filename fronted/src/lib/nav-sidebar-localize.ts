import type { TNavigationItem } from '@/data/navigation'
import type { AppMessages } from '@/utils/getT'

/**
 * Yan menü — üst seviye statik öğelerin etiketleri dil dosyasından.
 * Mega menü `getNavigationLocalized` ile zaten `navMenus.megaMenu` ile birleştirilir.
 */
export function applySidebarNavLabels(nav: TNavigationItem[], m: AppMessages): TNavigationItem[] {
  const labels = m.sidebar.navItemLabels as Record<string, string>
  return nav.map((item) => {
    const id = item.id ?? ''
    if (item.type === 'mega-menu') {
      return { ...item, name: m.navMenus.megaMenu.buttonLabel }
    }
    const label = labels[id]
    if (label) return { ...item, name: label }
    return item
  })
}
