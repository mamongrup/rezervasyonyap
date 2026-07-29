import { describe, expect, it } from 'vitest'
import { shouldUnoptimizeListingImage } from '@/lib/listing-image-optimization'
import { preferListingCardImageUrl } from '@/lib/prefer-listing-card-image'

describe('shouldUnoptimizeListingImage', () => {
  it('keeps local uploads on Next optimizer path', () => {
    expect(shouldUnoptimizeListingImage('/uploads/listings/foo.avif')).toBe(false)
  })

  it('bypasses optimizer for external and proxy sources', () => {
    expect(shouldUnoptimizeListingImage('https://cdn.example/foo.jpg')).toBe(true)
    expect(shouldUnoptimizeListingImage('/api/listing-ext-image?u=https%3A%2F%2Fcdn.example%2Ffoo.jpg')).toBe(
      true,
    )
    expect(shouldUnoptimizeListingImage('data:image/png;base64,abc')).toBe(true)
  })
})

describe('preferListingCardImageUrl', () => {
  it('adds a bounded WebP transform to proxied card images', () => {
    const result = preferListingCardImageUrl('https://bookeder.com/data/Photos/Big/1/example.jpg')
    expect(result).toContain('/api/listing-ext-image?u=')
    expect(result).toContain('&w=720&q=72&format=webp')
  })

  it('does not alter direct image URLs with transform parameters', () => {
    expect(preferListingCardImageUrl('https://productcdn.tatilbudur.com/Otel/example.jpg')).toBe(
      'https://productcdn.tatilbudur.com/Otel/example.jpg',
    )
  })
})
