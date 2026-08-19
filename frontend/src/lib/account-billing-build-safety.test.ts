import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const pageSource = readFileSync(
  join(process.cwd(), 'src', 'app', '[locale]', '(account)', 'account-billing', 'page.tsx'),
  'utf8'
)

describe('account billing production build safety', () => {
  it('reads locale on the server without request-bound client hooks', () => {
    expect(pageSource).not.toContain("'use client'")
    expect(pageSource).not.toContain('next/navigation')
    expect(pageSource).not.toContain('useParams')
    expect(pageSource).not.toContain('generateMetadata')
    expect(pageSource).toContain('await params')
  })
})
