import {
  DEFAULT_MEGA_MENU_STRUCTURE,
  normalizeMegaMenuStructure,
} from '@/lib/mega-menu-default-structure'
import { describe, expect, it } from 'vitest'

describe('mega menu structure', () => {
  it('contains only navigable child links', () => {
    const links = DEFAULT_MEGA_MENU_STRUCTURE.flatMap((group) =>
      group.children.map((child) => child.url),
    )

    expect(links).not.toContain('/authors/truelock-alric')
    expect(links).not.toContain('/checkout')
    expect(links).not.toContain('/add-listing/1')
    expect(links.every((url) => url.startsWith('/') && url !== '/#')).toBe(true)
  })

  it('repairs stale admin settings and restores every canonical category', () => {
    const normalized = normalizeMegaMenuStructure([
      {
        id: '4',
        url: '/#',
        children: [{ id: '4-1', url: '/authors/truelock-alric' }],
      },
    ])

    expect(normalized).toEqual(DEFAULT_MEGA_MENU_STRUCTURE)
    expect(normalized.flatMap((group) => group.children)).toContainEqual({
      id: '1-1',
      url: '/oteller/all',
    })
    expect(normalized.flatMap((group) => group.children)).toContainEqual({
      id: '4-1',
      url: '/tedarikci-ol',
    })
  })
})
