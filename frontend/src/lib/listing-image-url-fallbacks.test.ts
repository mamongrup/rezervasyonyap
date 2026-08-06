import { describe, expect, it } from 'vitest'
import {
  nextListingImageUrlFallback,
  repairExternalListingImageExt,
  restoreTatilbudurLocalUploadToCdn,
} from './listing-image-url-fallbacks'

describe('listing-image-url-fallbacks', () => {
  it('restores TatilBudur local rehost path to productcdn jpg', () => {
    expect(
      restoreTatilbudurLocalUploadToCdn(
        '/uploads/listings/ilanlar/oteller/kaya-villas-exclusive/00-kaya-villas-exclusive_16109_996345.avif',
      ),
    ).toBe(
      'https://productcdn.tatilbudur.com/Otel/855x426/kaya-villas-exclusive_16109_996345.jpg',
    )
    expect(
      repairExternalListingImageExt(
        '/uploads/listings/ilanlar/oteller/mivara-luxury-resort-spa/00-mivara-luxury-resort-spa_3634_795847.avif',
      ),
    ).toBe(
      'https://productcdn.tatilbudur.com/Otel/855x426/mivara-luxury-resort-spa_3634_795847.jpg',
    )
  })

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

  it('repairs Gezinomi .avif to .jpg', () => {
    const src =
      'https://images.gezinomi.com/assets/izmir-den-klasik-italya-turu-turk-hava-yollari-ozel-seferi-ile-gidis-sunexpress-31490--1-19.06.2026173142-b0.avif'
    expect(repairExternalListingImageExt(src)).toBe(
      'https://images.gezinomi.com/assets/izmir-den-klasik-italya-turu-turk-hava-yollari-ozel-seferi-ile-gidis-sunexpress-31490--1-19.06.2026173142-b0.jpg',
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

  it('repairs TravelAPI .avif to .jpg', () => {
    const src =
      'https://i.travelapi.com/lodging/92000000/91770000/91768000/91767946/b36ca39c_b.avif'
    expect(repairExternalListingImageExt(src)).toBe(
      'https://i.travelapi.com/lodging/92000000/91770000/91768000/91767946/b36ca39c_b.jpg',
    )
  })

  it('repairs Hotelbeds .avif to .jpg', () => {
    const src = 'https://photos.hotelbeds.com/giata/bigger/12/123456/123456a_hb_ro_001.avif'
    expect(repairExternalListingImageExt(src)).toBe(
      'https://photos.hotelbeds.com/giata/bigger/12/123456/123456a_hb_ro_001.jpg',
    )
  })

  it('falls back local uploads .avif to .webp when AVIF missing', () => {
    const avif = '/uploads/listings/ilanlar/tatil-evleri/puzzle-villa/villa-puzzle-18.avif'
    const next = nextListingImageUrlFallback(avif, new Set([avif]))
    expect(next).toBe('/uploads/listings/ilanlar/tatil-evleri/puzzle-villa/villa-puzzle-18.webp')
  })

  it('upgrades local uploads .webp to .avif first', () => {
    const webp = '/uploads/listings/ilanlar/tatil-evleri/puzzle-villa/villa-puzzle-18.webp'
    const next = nextListingImageUrlFallback(webp, new Set([webp]))
    expect(next).toBe('/uploads/listings/ilanlar/tatil-evleri/puzzle-villa/villa-puzzle-18.avif')
  })

  it('falls back local .webp to .jpg when avif already tried', () => {
    const webp = '/uploads/listings/ilanlar/tatil-evleri/puzzle-villa/villa-puzzle-18.webp'
    const avif = '/uploads/listings/ilanlar/tatil-evleri/puzzle-villa/villa-puzzle-18.avif'
    const next = nextListingImageUrlFallback(webp, new Set([webp, avif]))
    expect(next).toBe('/uploads/listings/ilanlar/tatil-evleri/puzzle-villa/villa-puzzle-18.jpg')
  })

  it('repairs Bookeder .png/.jpg to .JPEG', () => {
    expect(
      repairExternalListingImageExt(
        'https://bookeder.com/data/Photos/Big/17201/1720157/1720157310/img-silence-villas-fethiye-1.png',
      ),
    ).toBe(
      'https://bookeder.com/data/Photos/Big/17201/1720157/1720157310/img-silence-villas-fethiye-1.JPEG',
    )
    expect(
      repairExternalListingImageExt(
        'https://bookeder.com/data/Photos/Big/17201/1720157/1720157310/img-silence-villas-fethiye-1.jpg',
      ),
    ).toBe(
      'https://bookeder.com/data/Photos/Big/17201/1720157/1720157310/img-silence-villas-fethiye-1.JPEG',
    )
  })

  it('does not cycle Bookeder proxy to .png after JPEG tried', () => {
    const jpeg =
      'https://bookeder.com/data/Photos/Big/17201/1720157/1720157310/img-silence-villas-fethiye-1.JPEG'
    const proxy = `/api/listing-ext-image?u=${encodeURIComponent(jpeg)}&w=640&q=60&format=webp`
    const next = nextListingImageUrlFallback(proxy, new Set([proxy]))
    expect(next).toBeNull()
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
