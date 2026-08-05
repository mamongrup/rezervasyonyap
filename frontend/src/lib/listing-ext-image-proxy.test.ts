import { describe, expect, it } from 'vitest'

import { listingExtImageNeedsProxy, resolveListingDisplayImageUrl } from './listing-ext-image-proxy'

describe('listing external image proxy', () => {
  it('loads FairyStone images directly to avoid proxy timeouts', () => {
    const url = 'https://fairystonetravel.com/wp-content/uploads/2024/02/hotairballoon004.jpg'

    expect(listingExtImageNeedsProxy(url)).toBe(false)
    expect(resolveListingDisplayImageUrl(url)).toBe(url)
  })

  it('continues to proxy hosts that require server-side fetching', () => {
    expect(listingExtImageNeedsProxy('https://bookeder.com/images/hotel.jpg')).toBe(true)
  })

  it('repairs Gezinomi avif before proxy so cards do not hit CDN 400', () => {
    const url =
      'https://images.gezinomi.com/assets/foo-bar-31490--1-19.06.2026173142-b0.avif'
    const resolved = resolveListingDisplayImageUrl(url)
    expect(resolved).toContain('/api/listing-ext-image?u=')
    expect(decodeURIComponent(resolved)).toContain('.jpg')
    expect(decodeURIComponent(resolved)).not.toMatch(/\.avif(\?|$)/i)
  })
})
