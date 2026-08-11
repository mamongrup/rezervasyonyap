import { CATEGORY_REGISTRY } from '@/data/category-registry'
import { DEFAULT_HOME_PAGE_LINKS } from '@/lib/site-branding-seo'
import { CATEGORY_CARD_SEED_SOURCES } from '@/lib/category-default-thumbnails'
import { describe, expect, it } from 'vitest'
import { categoryOgImageUrl, categorySeoCopy } from './category-seo'

describe('category SEO contract', () => {
  it('has unique Turkish titles and useful descriptions for every category', () => {
    const copies = CATEGORY_REGISTRY.map((category) => categorySeoCopy(category, 'tr'))
    expect(new Set(copies.map((copy) => copy.title)).size).toBe(CATEGORY_REGISTRY.length)
    expect(copies.every((copy) => copy.title.length >= 25)).toBe(true)
    expect(copies.every((copy) => copy.description.length >= 90)).toBe(true)
  })

  it('builds an absolute category image endpoint', () => {
    expect(categoryOgImageUrl('https://rezervasyonyap.tr/', 'tatil-evleri')).toBe(
      'https://rezervasyonyap.tr/api/og/category?slug=tatil-evleri',
    )
  })

  it('keeps every category in the primary internal-link set', () => {
    const linkedPaths = new Set(DEFAULT_HOME_PAGE_LINKS.map((link) => link.path))
    for (const category of CATEGORY_REGISTRY) {
      expect(linkedPaths.has(`${category.categoryRoute}/all`), category.slug).toBe(true)
    }
  })

  it('assigns a relevant source image to every category', () => {
    for (const category of CATEGORY_REGISTRY) {
      expect(CATEGORY_CARD_SEED_SOURCES[category.slug]?.url, category.slug).toMatch(/^https:\/\//)
    }
  })
})
