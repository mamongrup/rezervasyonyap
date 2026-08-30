import { afterEach, expect, test, vi } from 'vitest'
import { processPendingSocialJobs } from '@/lib/social-auto-post'

vi.mock('@/lib/social-video-generate', () => ({ generateAndStoreListingReelVideo: vi.fn() }))
vi.mock('@/lib/site-branding-seo', () => ({ getPublicSiteUrl: () => 'https://example.com' }))

afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers() })

test('a missing cover stays pending without blocking a valid listing on the same network', async () => {
  vi.useFakeTimers()
  const patches: Array<{ id: string; status: string }> = []
  const jobs = ['broken', 'healthy'].map((id) => ({
    id, network: 'pinterest', entity_id: id, entity_type: 'listing',
    image_keys: [], allow_ai_caption: false, listing_title: id,
    listing_slug: id, category_code: 'hotel', post_type: 'feed',
  }))
  const fetchMock = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input)
    if (url.includes('/worker/pending?')) return Response.json({ jobs,
      social_api_json: JSON.stringify({ pinterest: { access_token: 'test-only', board_id: 'board' } }),
    })
    if (url.includes('/worker/jobs/')) {
      patches.push({ id: url.split('/').at(-1)!, ...JSON.parse(String(init?.body)) })
      return Response.json({ ok: true })
    }
    if (url.includes('/api/social/share-jpeg?')) {
      return decodeURIComponent(url).includes('handle=broken')
        ? new Response('missing', { status: 404 })
        : new Response('jpeg', { headers: { 'content-type': 'image/jpeg' } })
    }
    if (url === 'https://api.pinterest.com/v5/pins') return Response.json({ id: 'published-test' })
    throw new Error(`Unexpected test request: ${url}`)
  })
  vi.stubGlobal('fetch', fetchMock)
  const pending = processPendingSocialJobs({ apiOrigin: 'http://backend.test', secret: 'test-only', siteUrl: 'https://example.com' })
  await vi.runAllTimersAsync()
  const result = await pending
  expect(result).toMatchObject({ processed: 2, posted: 1, failed: 0 })
  expect(patches).toEqual([
    expect.objectContaining({ id: 'broken', status: 'pending' }),
    expect.objectContaining({ id: 'healthy', status: 'posted', external_post_id: 'published-test' }),
  ])
  expect(fetchMock.mock.calls.filter(([url]) => String(url) === 'https://api.pinterest.com/v5/pins')).toHaveLength(1)
})
