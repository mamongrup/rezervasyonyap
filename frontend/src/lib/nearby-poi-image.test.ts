import { describe, expect, it } from 'vitest'
import {
  isClientRenderablePoiImageUrl,
  isGooglePlacePhotoUrl,
  resolveNearbyPoiImageSrc,
} from './nearby-poi-image'

describe('nearby-poi-image', () => {
  it('proxies Google Place Photo URLs', () => {
    const url =
      'https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference=abc&key=secret'
    expect(isGooglePlacePhotoUrl(url)).toBe(true)
    expect(isClientRenderablePoiImageUrl(url)).toBe(true)
    expect(resolveNearbyPoiImageSrc(url)).toBe('/api/place-photo?maxwidth=800&photo_reference=abc')
  })

  it('accepts uploads and https', () => {
    expect(isClientRenderablePoiImageUrl('/uploads/external/x.avif')).toBe(true)
    expect(resolveNearbyPoiImageSrc('/uploads/external/x.avif')).toBe('/uploads/external/x.avif')
    expect(resolveNearbyPoiImageSrc('https://rezervasyonyap.tr/uploads/external/x.avif')).toBe(
      'https://rezervasyonyap.tr/uploads/external/x.avif',
    )
  })
})
