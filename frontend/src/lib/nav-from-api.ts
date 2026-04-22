import type { TNavigationItem } from '@/data/navigation'
import type { NavMenuItem } from '@/lib/travel-api'

type MegaMeta = {
  mergeMegaMenu?: boolean
}

function parseMegaJson(raw: string): MegaMeta {
  if (!raw || raw === '{}') return {}
  try {
    return JSON.parse(raw) as MegaMeta
  } catch {
    return {}
  }
}

function itemToNavNode(item: NavMenuItem, childMap: Map<string | null, NavMenuItem[]>): TNavigationItem {
  const url = item.url?.trim() || '#'
  const meta = parseMegaJson(item.mega_content_json ?? '{}')
  const children = childMap.get(item.id) ?? []
  const sorted = [...children].sort((a, b) => a.sort_order - b.sort_order)

  const node: TNavigationItem = {
    id: item.id,
    name: item.label_key,
    href: url,
  }

  if (meta.mergeMegaMenu) {
    node.type = 'mega-menu'
    node.href = node.href === '' || node.href === '#' ? '/' : node.href
  }

  if (sorted.length > 0) {
    node.children = sorted.map((c) => itemToNavNode(c, childMap))
  }

  return node
}

/**
 * Düz `menu_items` listesini ağaç yapısına çevirir (parent_id + sort_order).
 */
export function buildNavTreeFromItems(items: NavMenuItem[]): TNavigationItem[] {
  const childMap = new Map<string | null, NavMenuItem[]>()
  for (const it of items) {
    const pid = it.parent_id ?? null
    const list = childMap.get(pid) ?? []
    list.push(it)
    childMap.set(pid, list)
  }
  const roots = childMap.get(null) ?? []
  roots.sort((a, b) => a.sort_order - b.sort_order)
  return roots.map((r) => itemToNavNode(r, childMap))
}
