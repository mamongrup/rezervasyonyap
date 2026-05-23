import { describe, expect, it } from 'vitest'
import {
  isPlaceholderSiteLogoUrl,
  normalizeSiteLogoUrl,
  pickEffectiveSiteLogoUrls,
  resolveSiteLogoUrl,
} from '@/lib/resolve-site-logo-url'

describe('isPlaceholderSiteLogoUrl', () => {
  it('treats default light/dark stems as placeholder', () => {
    expect(isPlaceholderSiteLogoUrl('/uploads/site/logo-light.avif')).toBe(true)
    expect(isPlaceholderSiteLogoUrl('logo-dark.webp')).toBe(true)
  })

  it('allows custom uploads', () => {
    expect(
      isPlaceholderSiteLogoUrl('/uploads/general/branding/img-1776457230327-pkqft.avif'),
    ).toBe(false)
    expect(isPlaceholderSiteLogoUrl('/uploads/site/brand-logo-light.avif')).toBe(false)
  })
})

describe('pickEffectiveSiteLogoUrls', () => {
  it('uses dark logo when light is still default placeholder', () => {
    const { light, dark } = pickEffectiveSiteLogoUrls(
      '/uploads/site/logo-light.avif',
      '/uploads/general/branding/custom.avif',
    )
    expect(light).toBe('/uploads/general/branding/custom.avif')
    expect(dark).toBe('/uploads/general/branding/custom.avif')
  })

  it('returns null pair when both are placeholders', () => {
    expect(
      pickEffectiveSiteLogoUrls('/uploads/site/logo-light.webp', '/uploads/site/logo-dark.webp'),
    ).toEqual({ light: null, dark: null })
  })
})

describe('resolveSiteLogoUrl', () => {
  it('does not map placeholder to default webp', () => {
    expect(resolveSiteLogoUrl('/uploads/site/logo-light.avif')).toBe('')
  })

  it('keeps real upload paths', () => {
    expect(resolveSiteLogoUrl('/uploads/general/branding/x.avif')).toBe(
      '/uploads/general/branding/x.avif',
    )
  })
})

describe('normalizeSiteLogoUrl', () => {
  it('returns null for empty and placeholder', () => {
    expect(normalizeSiteLogoUrl('')).toBe(null)
    expect(normalizeSiteLogoUrl('/uploads/site/logo-light.avif')).toBe(null)
  })
})
