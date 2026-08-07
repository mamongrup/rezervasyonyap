import { describe, expect, it } from 'vitest'
import { escapeXml, generateGoogleHotelsXml } from './google-hotels-feed'

describe('Google Hotels XML Feed', () => {
  it('escapes XML characters properly', () => {
    expect(escapeXml('Hotel & Spa <Lüks>')).toBe('Hotel &amp; Spa &lt;Lüks&gt;')
    expect(escapeXml(null)).toBe('')
  })

  it('generates valid Google Hotel Center XML feed', () => {
    const mockListings = [
      {
        id: '12345',
        slug: 'bakucha-vineyard-hotel',
        title: 'Bakucha Vineyard Hotel & Spa',
        location: 'Kırklareli - Lüleburgaz',
        price_from: '6885',
        thumbnail_url: 'https://example.com/thumb.jpg',
        featured_image_url: 'https://example.com/feat.jpg',
        category_code: 'hotel',
        listing_vertical: 'hotel',
      },
    ] as any

    const xml = generateGoogleHotelsXml(mockListings, 'https://rezervasyonyap.com.tr')
    expect(xml).toContain('<listings')
    expect(xml).toContain('<id>12345</id>')
    expect(xml).toContain('<name>Bakucha Vineyard Hotel &amp; Spa</name>')
    expect(xml).toContain('<address format="simple">Kırklareli - Lüleburgaz</address>')
    expect(xml).toContain('<url>https://rezervasyonyap.com.tr/otel/bakucha-vineyard-hotel</url>')
    expect(xml).toContain('<price currency="TRY">6885</price>')
  })
})
