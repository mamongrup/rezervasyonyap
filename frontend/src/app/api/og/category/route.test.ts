import { NextRequest } from 'next/server'
import sharp from 'sharp'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { GET } from './route'

describe('category Open Graph image', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('returns a crawler-safe 1200x630 JPEG even when the remote source is unavailable', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(null, { status: 404 })))
    const response = await GET(
      new NextRequest('https://rezervasyonyap.tr/api/og/category?slug=aktiviteler'),
    )
    const bytes = Buffer.from(await response.arrayBuffer())
    const metadata = await sharp(bytes).metadata()

    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toBe('image/jpeg')
    expect(metadata).toMatchObject({ width: 1200, height: 630, format: 'jpeg' })
  })

  it('rejects unknown category slugs', async () => {
    const response = await GET(
      new NextRequest('https://rezervasyonyap.tr/api/og/category?slug=bilinmeyen'),
    )
    expect(response.status).toBe(404)
  })
})
