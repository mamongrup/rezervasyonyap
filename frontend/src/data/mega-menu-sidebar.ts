import { getStayCategories } from '@/data/categories'
import { DEFAULT_MEGA_MENU_SIDEBAR_STORED } from '@/lib/mega-menu-sidebar-defaults'
import type { MegaMenuSidebarStored } from '@/types/mega-menu-sidebar'
import { getMessages } from '@/utils/getT'

export type MegaMenuFeaturedCard = {
  name: string
  description: string
  count: number
  href: string
  thumbnail: string
  badgeLabel: string
  ctaLabel: string
}

/** Site ayarından veya eski tam kayıttan yapısal alanları çıkarır */
export function parseMegaMenuSidebarStored(raw: unknown): MegaMenuSidebarStored | null {
  if (raw === null || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const th = typeof o.thumbnail === 'string' ? o.thumbnail.trim() : ''
  const href = typeof o.href === 'string' ? o.href.trim() : ''
  if (!th || !href) return null
  const c = o.count
  const count = typeof c === 'number' && !Number.isNaN(c) ? c : Number(c) || 0
  return { thumbnail: th, href, count }
}

/**
 * Header mega menü sağ kartı — metinler dil dosyası, görsel/yol `mega_menu_sidebar`.
 */
export async function resolveMegaMenuFeatured(locale: string): Promise<MegaMenuFeaturedCard> {
  const m = getMessages(locale)
  const featured = m.navMenus.megaMenu.featured

  try {
    const { getCachedSiteConfig } = await import('@/lib/site-config-cache')
    const cfg = await getCachedSiteConfig()
    const raw = (cfg as Record<string, unknown> | null)?.mega_menu_sidebar
    const stored = parseMegaMenuSidebarStored(raw)
    if (stored) {
      const thumb = stored.thumbnail.trim() || DEFAULT_MEGA_MENU_SIDEBAR_STORED.thumbnail
      return {
        name: featured.title,
        description: featured.description,
        count: stored.count,
        href: stored.href.trim() || '/',
        thumbnail: thumb,
        badgeLabel: featured.badge,
        ctaLabel: featured.cta,
      }
    }
  } catch {
    /* fallback */
  }

  try {
    const cats = await getStayCategories()
    const c = cats[7] ?? cats[0]
    return {
      name: featured.title,
      description: featured.description,
      count: c.count,
      href: c.href,
      thumbnail: c.thumbnail,
      badgeLabel: featured.badge,
      ctaLabel: featured.cta,
    }
  } catch {
    const d = DEFAULT_MEGA_MENU_SIDEBAR_STORED
    return {
      name: featured.title,
      description: featured.description,
      count: d.count,
      href: d.href,
      thumbnail: d.thumbnail,
      badgeLabel: featured.badge,
      ctaLabel: featured.cta,
    }
  }
}
