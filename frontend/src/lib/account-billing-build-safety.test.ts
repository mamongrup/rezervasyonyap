import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const pageSource = readFileSync(
  join(process.cwd(), 'src', 'app', '[locale]', '(account)', 'account-billing', 'page.tsx'),
  'utf8'
)
const localeLayoutSource = readFileSync(
  join(process.cwd(), 'src', 'app', '[locale]', 'layout.tsx'),
  'utf8'
)
const rootLayoutSource = readFileSync(
  join(process.cwd(), 'src', 'app', 'layout.tsx'),
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

  it('does not force request-bound locale routes through static generation', () => {
    expect(localeLayoutSource).toContain("dynamic = 'force-dynamic'")
    expect(localeLayoutSource).toContain("fetchCache = 'force-no-store'")
    expect(localeLayoutSource).not.toContain('generateStaticParams')
  })

  it('keeps the global error fallback independent from request storage', () => {
    expect(rootLayoutSource).not.toContain("from 'next/headers'")
    expect(rootLayoutSource).not.toContain('await headers()')
    expect(rootLayoutSource).not.toContain('generateMetadata')
    expect(rootLayoutSource).toContain('export const metadata')
    expect(existsSync(join(process.cwd(), 'src', 'app', 'global-error.tsx'))).toBe(false)
  })
})
