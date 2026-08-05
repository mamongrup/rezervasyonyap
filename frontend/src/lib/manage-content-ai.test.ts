import { describe, expect, it } from 'vitest'
import { normalizeSeoKeywordsCsv } from './manage-content-ai'

describe('normalizeSeoKeywordsCsv', () => {
  it('cleans numbered and quoted keyword lists', () => {
    expect(
      normalizeSeoKeywordsCsv('1. Kalkan villa\n2. "balayı villası"\n3. deniz manzarası'),
    ).toBe('Kalkan villa, balayı villası, deniz manzarası')
  })

  it('keeps a simple comma list', () => {
    expect(normalizeSeoKeywordsCsv('kalkan, villa kiralama, özel havuz')).toBe(
      'kalkan, villa kiralama, özel havuz',
    )
  })
})
