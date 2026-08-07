import { describe, expect, it } from 'vitest'
import { isPublicBlogTag, resolvePublicBlogTags } from './blog-public-tags'

describe('isPublicBlogTag & resolvePublicBlogTags', () => {
  it('filters out ai- prefixed tags', () => {
    expect(isPublicBlogTag('ai-region-content')).toBe(false)
    expect(isPublicBlogTag('ai-place-blog')).toBe(false)
    expect(isPublicBlogTag('ai_test')).toBe(false)
  })

  it('filters out location: prefixed tags and UUID tags', () => {
    expect(isPublicBlogTag('location:63b6acf1-8dfc-4d09-ae27-d03277e0d015')).toBe(false)
    expect(isPublicBlogTag('location:istanbul')).toBe(false)
    expect(isPublicBlogTag('63b6acf1-8dfc-4d09-ae27-d03277e0d015')).toBe(false)
  })

  it('filters out system: and colon-containing internal tags', () => {
    expect(isPublicBlogTag('system:internal')).toBe(false)
    expect(isPublicBlogTag('category:blog')).toBe(false)
  })

  it('filters array of tags and derives tags if only internal tags were present', () => {
    const raw = [
      'ai-region-content',
      'location:63b6acf1-8dfc-4d09-ae27-d03277e0d015',
    ]
    const resolved = resolvePublicBlogTags(raw, {
      title: 'Sivaslı Gezilecek Yerler',
      slug: 'tr-usak-sivasli-gezilecek-yerler',
    })
    expect(resolved).not.toContain('ai-region-content')
    expect(resolved).not.toContain('location:63b6acf1-8dfc-4d09-ae27-d03277e0d015')
    expect(resolved).toContain('sivasli')
  })
})
