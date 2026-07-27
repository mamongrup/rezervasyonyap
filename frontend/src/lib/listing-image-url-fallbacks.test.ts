import { describe, expect, it } from 'vitest'
import {
  nextListingImageUrlFallback,
  repairBookederImageExt,
} from './listing-image-url-fallbacks'

describe('listing-image-url-fallbacks', () => {
  it('repairs Bookeder .avif to .JPEG', () => {
    const src =
      'https://bookeder.com/data/Photos/Big/17201/1720157/1720157310/img-silence-villas-fethiye-1.avif'
    expect(repairBookederImageExt(src)).toBe(
      'https://bookeder.com/data/Photos/Big/17201/1720157/1720157310/img-silence-villas-fethiye-1.JPEG',
    )
  })

  it('falls back uploads .avif to .webp', () => {
    const avif = '/uploads/listings/ilanlar/tatil-evleri/puzzle-villa/villa-puzzle-18.avif'
    const next = nextListingImageUrlFallback(avif, new Set([avif]))
    expect(next).toBe('/uploads/listings/ilanlar/tatil-evleri/puzzle-villa/villa-puzzle-18.webp')
  })

  it('falls back proxy Bookeder .avif via upstream', () => {
    const upstream =
      'https://bookeder.com/data/Photos/Big/17201/1720157/1720157310/img-silence-villas-fethiye-1.avif'
    const proxy = `/api/listing-ext-image?u=${encodeURIComponent(upstream)}`
    const next = nextListingImageUrlFallback(proxy, new Set([proxy]))
    expect(next).toContain('listing-ext-image')
    expect(decodeURIComponent(next!.split('u=')[1]!)).toContain('.JPEG')
  })
})
