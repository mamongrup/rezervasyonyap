import { describe, expect, it } from 'vitest'
import {
  deriveBlogTagsFromTitleAndSlug,
  isPublicBlogTag,
  resolvePublicBlogTags,
} from './blog-public-tags'

describe('blog-public-tags', () => {
  it('hides technical and category-marker tags', () => {
    expect(isPublicBlogTag('ai-region-content')).toBe(false)
    expect(isPublicBlogTag('location:68e3368d-c48d-44a8-9d92-063d701a973d')).toBe(false)
    expect(isPublicBlogTag('gezi-fikirleri')).toBe(false)
    expect(isPublicBlogTag('cukurca')).toBe(true)
    expect(isPublicBlogTag('gezilecek-yerler')).toBe(true)
  })

  it('derives place + topic from title and slug', () => {
    expect(
      deriveBlogTagsFromTitleAndSlug(
        'Çukurca Gezilecek Yerler',
        'tr-hakkari-cukurca-gezilecek-yerler',
      ),
    ).toEqual(['cukurca', 'hakkari', 'gezilecek-yerler'])
  })

  it('prefers stored public tags when present', () => {
    expect(
      resolvePublicBlogTags(
        [
          'ai-region-content',
          'location:68e3368d-c48d-44a8-9d92-063d701a973d',
          'gezi-fikirleri',
          'cukurca',
          'hakkari',
          'gezilecek-yerler',
        ],
        { title: 'Çukurca Gezilecek Yerler', slug: 'tr-hakkari-cukurca-gezilecek-yerler' },
      ),
    ).toEqual(['cukurca', 'hakkari', 'gezilecek-yerler'])
  })

  it('falls back to title/slug when only technical tags exist', () => {
    expect(
      resolvePublicBlogTags(
        [
          'ai-region-content',
          'location:68e3368d-c48d-44a8-9d92-063d701a973d',
          'gezi-fikirleri',
        ],
        { title: 'Çukurca Gezilecek Yerler', slug: 'tr-hakkari-cukurca-gezilecek-yerler' },
      ),
    ).toEqual(['cukurca', 'hakkari', 'gezilecek-yerler'])
  })
})
