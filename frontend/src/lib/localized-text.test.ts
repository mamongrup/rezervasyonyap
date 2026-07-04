import { describe, expect, it } from 'vitest'
import { looksLikeLocalizedText, resolveLocalizedDeep } from './localized-text'

describe('looksLikeLocalizedText', () => {
  it('accepts locale→string maps', () => {
    expect(looksLikeLocalizedText({ tr: 'Merhaba', en: 'Hello' })).toBe(true)
    expect(looksLikeLocalizedText({ tr: 'Sadece TR' })).toBe(true)
  })

  it('rejects video items (id is two letters but not a locale map)', () => {
    expect(
      looksLikeLocalizedText({
        id: 'sv-1',
        title: 'Kapadokya',
        videoUrl: 'https://www.youtube.com/watch?v=j-kGyqW99Vo',
      }),
    ).toBe(false)
  })

  it('rejects empty or non-objects', () => {
    expect(looksLikeLocalizedText({})).toBe(false)
    expect(looksLikeLocalizedText(null)).toBe(false)
    expect(looksLikeLocalizedText('tr')).toBe(false)
  })
})

describe('resolveLocalizedDeep', () => {
  it('preserves section_videos config videos array', () => {
    const config = {
      heading: { tr: 'Videolar', en: 'Videos' },
      subheading: 'Açıklama',
      videos: [
        {
          id: 'sv-1',
          title: 'Dünyanın En Güzel 28 Köyü',
          videoUrl: 'https://www.youtube.com/watch?v=j-kGyqW99Vo',
        },
        {
          id: 'v-1710000000000',
          title: 'Yeni Video',
          videoUrl: 'https://youtu.be/scaZbxdoDpk',
          thumbnail: '',
        },
      ],
    }

    const resolved = resolveLocalizedDeep(config, 'tr') as typeof config

    expect(resolved.heading).toBe('Videolar')
    expect(resolved.subheading).toBe('Açıklama')
    expect(resolved.videos).toHaveLength(2)
    expect(resolved.videos[0]).toEqual(config.videos[0])
    expect(resolved.videos[1].videoUrl).toBe('https://youtu.be/scaZbxdoDpk')
  })

  it('does not collapse video objects into id strings', () => {
    const videos = [
      { id: 'sv-1', title: 'A', videoUrl: 'https://www.youtube.com/watch?v=aaaaaaaaaaa' },
    ]
    const resolved = resolveLocalizedDeep({ videos }, 'tr') as { videos: unknown[] }
    expect(typeof resolved.videos[0]).toBe('object')
    expect(resolved.videos[0]).toMatchObject({ videoUrl: 'https://www.youtube.com/watch?v=aaaaaaaaaaa' })
  })
})
