import { describe, expect, it } from 'vitest'
import {
  nextListingImageUrlFallback,
  repairExternalListingImageExt,
} from './listing-image-url-fallbacks'

describe('listing-image-url-fallbacks', () => {
  it('repairs Bookeder .avif to .JPEG', () => {
    const src =
      'https://bookeder.com/data/Photos/Big/17201/1720157/1720157310/img-silence-villas-fethiye-1.avif'
    expect(repairExternalListingImageExt(src)).toBe(
      'https://bookeder.com/data/Photos/Big/17201/1720157/1720157310/img-silence-villas-fethiye-1.JPEG',
    )
  })

  it('repairs TatilBudur .avif to .jpg', () => {
    const src =
      'https://productcdn.tatilbudur.com/Otel/gallery/seamelia-beach-resort-hotel-spa_1857_848668.avif'
    expect(repairExternalListingImageExt(src)).toBe(
      'https://productcdn.tatilbudur.com/Otel/gallery/seamelia-beach-resort-hotel-spa_1857_848668.jpg',
    )
  })

  it('repairs TatilBudur .JPEG to .jpg', () => {
    const src =
      'https://productcdn.tatilbudur.com/Otel/gallery/seamelia-beach-resort-hotel-spa_1857_848668.JPEG'
    expect(repairExternalListingImageExt(src)).toBe(
      'https://productcdn.tatilbudur.com/Otel/gallery/seamelia-beach-resort-hotel-spa_1857_848668.jpg',
    )
  })

  it('repairs Reserwation tour .avif to .jpg', () => {
    const src = 'https://reserwation.com/Uploads/Gallery/2/roma-3185-27122023.avif'
    expect(repairExternalListingImageExt(src)).toBe(
      'https://reserwation.com/Uploads/Gallery/2/roma-3185-27122023.jpg',
    )
  })

  it('repairs FairyStone activity .avif to .jpg', () => {
    const src =
      'https://fairystonetravel.com/wp-content/uploads/2024/02/hotairballoon004.avif'
    expect(repairExternalListingImageExt(src)).toBe(
      'https://fairystonetravel.com/wp-content/uploads/2024/02/hotairballoon004.jpg',
    )
  })

  it('repairs Wikimedia ferry .avif to .jpg', () => {
    const src =
      'https://upload.wikimedia.org/wikipedia/commons/1/15/Kastelorizo_Hafen.avif'
    expect(repairExternalListingImageExt(src)).toBe(
      'https://upload.wikimedia.org/wikipedia/commons/1/15/Kastelorizo_Hafen.jpg',
    )
  })

  it('repairs Yolcu360 .avif to .png', () => {
    const src =
      'https://integration-static.yolcu360.com/vehicle/70571c08-e2d6-42e9-92e0-f4387c5a3013.avif'
    expect(repairExternalListingImageExt(src)).toBe(
      'https://integration-static.yolcu360.com/vehicle/70571c08-e2d6-42e9-92e0-f4387c5a3013.png',
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
