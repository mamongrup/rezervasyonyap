import type { TNavigationItem } from '@/data/navigation'
import type { AppMessages } from '@/utils/getT'

type GroupMap = Record<string, { title: string; links: Record<string, string> }>

export function localizeMegaMenu(mega: TNavigationItem, m: AppMessages): TNavigationItem {
  if (mega.type !== 'mega-menu') return mega
  const nav = m.navMenus.megaMenu
  const groups = nav.groups as GroupMap
  return {
    ...mega,
    name: nav.buttonLabel,
    children: mega.children?.map((g) => {
      const gid = g.id ?? ''
      const gLoc = groups[gid]
      return {
        ...g,
        name: gLoc?.title ?? g.name ?? gid,
        children: g.children?.map((c) => {
          const cid = c.id ?? ''
          const linkLabel = gLoc?.links?.[cid]
          return {
            ...c,
            name: linkLabel ?? c.name ?? cid,
          }
        }),
      }
    }),
  }
}
