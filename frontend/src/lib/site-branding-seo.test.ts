import { describe, expect, it } from 'vitest'
import {
  DEFAULT_OG_IMAGE_PATH,
  isCrawlerSafeOgImageUrl,
  resolveShareOgImageUrl,
} from '@/lib/site-branding-seo'
import type { SitePublicConfig } from '@/lib/travel-api'

describe('isCrawlerSafeOgImageUrl', () => {
  it('accepts jpeg/png/gif', () => {
    expect(isCrawlerSafeOgImageUrl('https://example.com/a.jpg')).toBe(true)
    expect(isCrawlerSafeOgImageUrl('https://example.com/a.jpeg')).toBe(true)
    expect(isCrawlerSafeOgImageUrl('https://example.com/a.png')).toBe(true)
    expect(isCrawlerSafeOgImageUrl('/og-default.jpg')).toBe(true)
  })

  it('rejects avif/svg/webp used by site logos', () => {
    expect(isCrawlerSafeOgImageUrl('https://rezervasyonyap.tr/uploads/site/brand-logo-light.avif')).toBe(
      false,
    )
    expect(isCrawlerSafeOgImageUrl('/favicon.svg')).toBe(false)
    expect(isCrawlerSafeOgImageUrl('https://example.com/hero.webp')).toBe(false)
  })
})

describe('resolveShareOgImageUrl', () => {
  const base = 'https://rezervasyonyap.tr'

  it('falls back to default JPEG when logo is AVIF', () => {
    const pub = {
      branding: { logo_url: '/uploads/site/brand-logo-light.avif' },
    } as unknown as SitePublicConfig
    expect(resolveShareOgImageUrl(base, pub)).toBe(`${base}${DEFAULT_OG_IMAGE_PATH}`)
  })

  it('prefers branding.og_image_url when crawler-safe', () => {
    const pub = {
      branding: {
        og_image_url: '/uploads/site/share.jpg',
        logo_url: '/uploads/site/brand-logo-light.avif',
      },
    } as unknown as SitePublicConfig
    expect(resolveShareOgImageUrl(base, pub)).toBe(`${base}/uploads/site/share.jpg`)
  })
})
