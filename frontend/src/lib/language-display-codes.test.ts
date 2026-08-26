import { describe, expect, it } from 'vitest'

import { formatLanguageCodes } from '@/lib/language-display-codes'

describe('language display codes', () => {
  it('normalizes language names and ISO variants to unique two-letter codes', () => {
    expect(formatLanguageCodes(['Türkçe', 'English', 'Deutsch', 'Русский', '中文', 'Français', 'en']))
      .toBe('TR, EN, DE, RU, ZH, FR')
  })
})
