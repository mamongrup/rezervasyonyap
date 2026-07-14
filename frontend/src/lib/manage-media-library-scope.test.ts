import { describe, expect, it } from 'vitest'

import {
  defaultMediaLibraryRootForTarget,
  initialMediaBrowsePrefix,
  mediaBrowseAllowed,
  mediaCanBrowseUp,
  mediaUploadBasePath,
  normalizeMediaPath,
  parentMediaBrowsePrefix,
  resolveMediaLibraryBase,
} from '@/lib/manage-media-library-scope'

describe('manage media library scope', () => {
  it('keeps logo and favicon uploads scoped to the site root', () => {
    const target = { folder: 'site', subPath: '' }

    expect(mediaUploadBasePath(target)).toBe('site')
    expect(resolveMediaLibraryBase(target)).toBe('site')
    expect(initialMediaBrowsePrefix(target)).toBe('site')
  })

  it('keeps listing galleries scoped to the active listing folder', () => {
    const target = {
      folder: 'listings',
      subPath: 'ilanlar/oteller/kaya-otel',
    }

    expect(resolveMediaLibraryBase(target)).toBe('listings/ilanlar/oteller/kaya-otel')
    expect(initialMediaBrowsePrefix(target)).toBe('listings/ilanlar/oteller/kaya-otel')
  })

  it('can browse the full gallery while keeping the upload folder as the starting point', () => {
    const target = { folder: 'branding', subPath: '' }

    expect(resolveMediaLibraryBase(target, '/')).toBe('')
    expect(initialMediaBrowsePrefix(target, '/')).toBe('branding')
    expect(mediaBrowseAllowed('', 'listings/ilanlar/villa')).toBe(true)
    expect(mediaCanBrowseUp('', 'branding')).toBe(true)
    expect(parentMediaBrowsePrefix('', 'branding')).toBe('')
  })

  it('lets pagebuilder modules browse the shared pagebuilder root while uploading into the module folder', () => {
    const target = {
      folder: 'site',
      subPath: 'page-builder/image-text/oteller',
    }

    expect(defaultMediaLibraryRootForTarget(target)).toBe('site/page-builder')
    expect(resolveMediaLibraryBase(target)).toBe('site/page-builder')
    expect(initialMediaBrowsePrefix(target)).toBe('site/page-builder/image-text/oteller')
    expect(mediaBrowseAllowed('site/page-builder', 'site/page-builder/video-gallery/turlar')).toBe(true)
    expect(mediaCanBrowseUp('site/page-builder', 'site/page-builder/image-text/oteller')).toBe(true)
    expect(parentMediaBrowsePrefix('site/page-builder', 'site/page-builder/image-text/oteller')).toBe(
      'site/page-builder/image-text',
    )
    expect(parentMediaBrowsePrefix('site/page-builder', 'site/page-builder')).toBe('site/page-builder')
  })

  it('lets category hero images browse the shared vitrin-kategori root', () => {
    const target = {
      folder: 'site',
      subPath: 'vitrin-kategori/oteller',
    }

    expect(resolveMediaLibraryBase(target)).toBe('site/vitrin-kategori')
    expect(initialMediaBrowsePrefix(target)).toBe('site/vitrin-kategori/oteller')
  })

  it('rejects unrelated explicit library roots and normalizes unsafe path fragments', () => {
    const target = {
      folder: 'site',
      subPath: 'page-builder/image-text/oteller',
    }

    expect(normalizeMediaPath('/site/./page-builder/../logo//')).toBe('site/page-builder/logo')
    expect(resolveMediaLibraryBase(target, 'listings')).toBe('site/page-builder/image-text/oteller')
  })
})
