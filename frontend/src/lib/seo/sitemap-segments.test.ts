import { describe, expect, it } from 'vitest'
import {
  allSitemapSegmentIds,
  categoryBrowsePathForVertical,
  filterSitemapEntriesForSegment,
  isSitemapSegmentId,
  SITEMAP_SITE_SEGMENT,
} from '@/lib/seo/sitemap-segments'
import type { SitemapEntry } from '@/lib/travel-api'

describe('sitemap-segments', () => {
  it('lists site + every catalog vertical', () => {
    const ids = allSitemapSegmentIds()
    expect(ids[0]).toBe(SITEMAP_SITE_SEGMENT)
    expect(ids).toContain('hotel')
    expect(ids).toContain('tour')
    expect(ids).toContain('yacht_charter')
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('resolves category browse hubs', () => {
    expect(categoryBrowsePathForVertical('hotel')).toBe('/oteller/all')
    expect(categoryBrowsePathForVertical('tour')).toBe('/turlar/all')
    expect(categoryBrowsePathForVertical('holiday_home')).toBe('/tatil-evleri/all')
    expect(categoryBrowsePathForVertical('car_rental')).toBe('/arac-kiralama/all')
  })

  it('filters entries by category segment', () => {
    const entries: SitemapEntry[] = [
      { kind: 'listing', slug: 'a', organization_id: '', category_code: 'hotel' },
      { kind: 'listing', slug: 'b', organization_id: '', category_code: 'tour' },
      { kind: 'blog_post', slug: 'post', organization_id: '' },
      { kind: 'cms_page', slug: 'about', organization_id: '' },
      { kind: 'listing', slug: 'x', organization_id: '', category_code: 'unknown_x' },
    ]
    expect(filterSitemapEntriesForSegment(entries, 'hotel').map((e) => e.slug)).toEqual(['a'])
    expect(filterSitemapEntriesForSegment(entries, 'tour').map((e) => e.slug)).toEqual(['b'])
    expect(filterSitemapEntriesForSegment(entries, 'site').map((e) => e.slug)).toEqual([
      'post',
      'about',
      'x',
    ])
  })

  it('validates segment ids', () => {
    expect(isSitemapSegmentId('site')).toBe(true)
    expect(isSitemapSegmentId('hotel')).toBe(true)
    expect(isSitemapSegmentId('nope')).toBe(false)
  })
})
