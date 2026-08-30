import { expect, it, vi } from 'vitest'
import { probeShareImage, resolveSocialCover } from './cover-probe'

it('recovers a missing stored cover using the same listing branded cover', async () => {
  const fetcher = vi.fn<typeof fetch>().mockResolvedValueOnce(Response.json({ error: 'social_share_image_fetch_failed' }, { status: 502 }))
    .mockResolvedValueOnce(new Response('image', { headers: { 'content-type': 'image/jpeg' } }))
  const result = await resolveSocialCover('https://site.test', ['https://site.test/uploads/social-covers/missing.avif', 'https://site.test/api/og/listing?handle=villa'], fetcher)
  expect(result.source).toContain('handle=villa')
  expect(result.error).toBe('')
  expect(fetcher).toHaveBeenCalledTimes(2)
})
it('keeps detailed safe errors and never accepts HTML as an image', async () => {
  const fetcher = vi.fn<typeof fetch>().mockResolvedValueOnce(new Response('html', { headers: { 'content-type': 'text/html' } }))
  expect((await resolveSocialCover('https://site.test', ['https://site.test/cover'], fetcher)).error).toBe('social_cover_unavailable:http_200_not_jpeg')
})
it('does not probe duplicate candidates or expose upstream secrets', async () => {
  const fetcher = vi.fn<typeof fetch>().mockResolvedValueOnce(Response.json({ error: 'secret=abcdef' }, { status: 500 }))
  expect((await resolveSocialCover('https://site.test', ['https://site.test/cover', 'https://site.test/cover'], fetcher)).error).toBe('social_cover_unavailable:http_500')
  expect(fetcher).toHaveBeenCalledTimes(1)
})
it('reports timeout and missing HTTPS cover without a successful fallback', async () => {
  expect((await probeShareImage('http://site.test/a')).ok).toBe(false)
  const fetcher = vi.fn<typeof fetch>().mockRejectedValue(new Error('internal secret'))
  expect((await probeShareImage('https://site.test/a', fetcher)).error).toBe('network_or_timeout')
})
