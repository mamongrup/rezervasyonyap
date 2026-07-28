import { describe, expect, it } from 'vitest'
import { shouldUnoptimizeListingImage } from '@/lib/listing-image-optimization'

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
