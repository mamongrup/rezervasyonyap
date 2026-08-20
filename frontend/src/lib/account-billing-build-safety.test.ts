import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const pageSource = readFileSync(
  join(process.cwd(), 'src', 'app', '[locale]', '(account)', 'account-billing', 'page.tsx'),
  'utf8'
)

describe('account billing production build safety', () => {
  it('reads locale from context without request-bound Next hooks', () => {
    expect(pageSource).toContain("'use client'")
    expect(pageSource).toContain('useLocaleSegment')
    expect(pageSource).not.toContain('next/navigation')
    expect(pageSource).not.toContain('useParams')
    expect(pageSource).not.toContain('generateMetadata')
    expect(pageSource).not.toContain('await params')
  })
})
