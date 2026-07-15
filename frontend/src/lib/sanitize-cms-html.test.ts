import { describe, expect, it } from 'vitest'
import { normalizeImportedRichTextHtml, sanitizeRichCmsHtml } from './sanitize-cms-html'

describe('normalizeImportedRichTextHtml', () => {
  it('decodes provider HTML that was stored as visible escaped tags', () => {
    const result = sanitizeRichCmsHtml(
      normalizeImportedRichTextHtml('&lt;p&gt;Konum bilgisi&lt;/p&gt;&lt;ul&gt;&lt;li&gt;Merkez&lt;/li&gt;&lt;/ul&gt;'),
    )

    expect(result).toBe('<p>Konum bilgisi</p><ul><li>Merkez</li></ul>')
  })

  it('turns a long plain provider description into readable paragraphs', () => {
    const result = normalizeImportedRichTextHtml(
      'Birinci cümle. İkinci cümle. Üçüncü cümle. Dördüncü cümle.',
    )

    expect(result).toContain('<p>Birinci cümle. İkinci cümle. Üçüncü cümle.</p>')
    expect(result).toContain('<p>Dördüncü cümle.</p>')
  })
})
