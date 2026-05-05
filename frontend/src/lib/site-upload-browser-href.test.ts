import { describe, expect, it } from 'vitest'

import { managePanelUploadPreviewSrc, siteUploadBrowserHref } from '@/lib/site-upload-browser-href'

describe('siteUploadBrowserHref', () => {
  it('maps /uploads/site/** to /api/site-upload with encoded segments', () => {
    expect(siteUploadBrowserHref('/uploads/site/page-builder/o/kart-1.avif')).toBe(
      '/api/site-upload/site/page-builder/o/kart-1.avif',
    )
  })

  it('trims whitespace', () => {
    expect(siteUploadBrowserHref('  /uploads/site/a/b.avif  ')).toBe(
      '/api/site-upload/site/a/b.avif',
    )
  })

  it('encodes non-ASCII segments', () => {
    expect(siteUploadBrowserHref('/uploads/site/x/türkçe.avif')).toBe(
      '/api/site-upload/site/x/t%C3%BCrk%C3%A7e.avif',
    )
  })

  it('leaves non-site upload paths unchanged', () => {
    expect(siteUploadBrowserHref('/uploads/other/x.avif')).toBe('/uploads/other/x.avif')
  })
})

describe('managePanelUploadPreviewSrc', () => {
  it('proxies relative site uploads', () => {
    expect(managePanelUploadPreviewSrc('/uploads/site/page-builder/o/k.avif')).toBe(
      '/api/site-upload/site/page-builder/o/k.avif',
    )
  })

  it('proxies absolute https URLs whose pathname is under /uploads/site/', () => {
    expect(
      managePanelUploadPreviewSrc('https://rezervasyonyap.tr/uploads/site/page-builder/o/k.avif'),
    ).toBe('/api/site-upload/site/page-builder/o/k.avif')
  })

  it('proxies protocol-relative URLs under /uploads/site/', () => {
    expect(managePanelUploadPreviewSrc('//rezervasyonyap.tr/uploads/site/a/b.avif')).toBe(
      '/api/site-upload/site/a/b.avif',
    )
  })

  it('returns empty string for empty input', () => {
    expect(managePanelUploadPreviewSrc('')).toBe('')
  })

  it('does not rewrite unrelated absolute URLs', () => {
    expect(managePanelUploadPreviewSrc('https://cdn.example.com/logo.png')).toBe(
      'https://cdn.example.com/logo.png',
    )
  })
})
