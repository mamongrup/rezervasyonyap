import { describe, expect, it } from 'vitest'
import {
  absoluteSitemapImages,
  escapeXmlText,
  normalizeSitemapSegmentParam,
  sitemapEntriesToXml,
} from '@/lib/seo/build-sitemap-xml'

describe('build-sitemap-xml helpers', () => {
  it('normalizes .xml segment params', () => {
    expect(normalizeSitemapSegmentParam('hotel.xml')).toBe('hotel')
    expect(normalizeSitemapSegmentParam('site')).toBe('site')
    expect(normalizeSitemapSegmentParam('HOTEL.XML')).toBe('HOTEL')
  })

  it('escapes XML text', () => {
    expect(escapeXmlText(`a&b<c>"d"`)).toBe('a&amp;b&lt;c&gt;&quot;d&quot;')
  })

  it('absolutizes upload image paths', () => {
    expect(absoluteSitemapImages('https://rezervasyonyap.tr', ['/uploads/a.jpg', 'http://x.com/b.jpg'])).toEqual([
      'https://rezervasyonyap.tr/uploads/a.jpg',
      'https://x.com/b.jpg',
    ])
  })

  it('serializes urlset with optional images', () => {
    const xml = sitemapEntriesToXml([
      { url: 'https://example.com/a', changeFrequency: 'daily', priority: 1 },
      { url: 'https://example.com/b', images: ['https://example.com/i.jpg'] },
    ])
    expect(xml).toContain('xmlns:image=')
    expect(xml).toContain('<loc>https://example.com/a</loc>')
    expect(xml).toContain('<image:loc>https://example.com/i.jpg</image:loc>')
    expect(xml).toContain('<changefreq>daily</changefreq>')
  })
})
