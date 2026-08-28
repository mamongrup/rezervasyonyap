import type { ListingImage } from '@/lib/travel-api'
import { describe, expect, it } from 'vitest'
import { autoOrderListingImages, type ListingImageAiAnalysis } from './listing-image-auto-order'

function image(id: string, scene: string, sortOrder: number): ListingImage {
  return {
    id,
    scene_code: scene,
    sort_order: sortOrder,
    storage_key: `uploads/listings/demo/${id}-img.avif`,
    original_mime: 'image/avif',
    alt_text_key: null,
    created_at: '2026-01-01T00:00:00Z',
  }
}

function analyses(rows: Array<[string, string, number]>): Map<string, ListingImageAiAnalysis> {
  return new Map(rows.map(([id, scene_code, hero_score]) => [id, { scene_code, hero_score }]))
}

describe('autoOrderListingImages', () => {
  it('does not make a bathroom or indoor spa the cover when a representative scene exists', () => {
    const rows = [image('12', 'bathroom', 0), image('18', 'bedroom', 1), image('26', 'exterior', 2)]
    const ordered = autoOrderListingImages(
      rows,
      analyses([
        ['12', 'bathroom', 99],
        ['18', 'bedroom', 75],
        ['26', 'exterior', 70],
      ])
    )
    expect(ordered[0]?.id).toBe('26')
  })

  it('builds a diverse first five before grouping the remaining gallery', () => {
    const rows = [
      image('1', 'pool', 0),
      image('2', 'pool', 1),
      image('3', 'living', 2),
      image('4', 'bedroom', 3),
      image('5', 'bathroom', 4),
      image('6', 'exterior', 5),
      image('7', 'garden', 6),
    ]
    const ordered = autoOrderListingImages(rows, analyses(rows.map((r) => [r.id, r.scene_code!, 70])))
    expect(ordered.slice(0, 5).map((r) => r.scene_code)).toEqual(['exterior', 'pool', 'garden', 'living', 'bedroom'])
    expect(new Set(ordered.map((r) => r.id)).size).toBe(rows.length)
  })

  it('uses natural file numbering for otherwise equal images', () => {
    const rows = [image('12', 'bedroom', 0), image('2', 'bedroom', 1), image('3', 'bedroom', 2)]
    const ordered = autoOrderListingImages(rows, analyses(rows.map((r) => [r.id, 'bedroom', 50])))
    expect(ordered.map((r) => r.id)).toEqual(['2', '3', '12'])
  })
})
