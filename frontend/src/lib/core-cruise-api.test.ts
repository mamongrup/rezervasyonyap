import { describe, expect, it, vi } from 'vitest'
import { CoreCruiseApiError, CoreCruiseClient } from './core-cruise-api'

describe('CoreCruiseClient', () => {
  it('fetches and combines every cruise cursor page', async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: [{ id: 'one' }],
            pagination: { per_page: 50, next_cursor: 'opaque+cursor=', prev_cursor: null, has_more: true },
          })
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: [{ id: 'two' }],
            pagination: { per_page: 50, next_cursor: null, prev_cursor: 'previous', has_more: false },
          })
        )
      )
    const client = new CoreCruiseClient({ token: 'secret', fetch: fetcher })

    const cruises = await client.getAllCruises()

    expect(cruises.map((item) => item.id)).toEqual(['one', 'two'])
    expect(fetcher).toHaveBeenCalledTimes(2)
    expect(fetcher.mock.calls[1][0]).toContain('cursor=opaque%2Bcursor%3D')
    expect(fetcher.mock.calls[0][1].headers.Authorization).toBe('Bearer secret')
  })

  it('sends array query fields and preserves documented boolean syntax', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: [] })))
    const client = new CoreCruiseClient({ token: 'secret', fetch: fetcher })

    await client.getCruiseAvailability('cruise/id', {
      adults: 2,
      children: 1,
      ages: [34, 7, 2],
      include_guest_prices: true,
    })

    const url = String(fetcher.mock.calls[0][0])
    expect(url).toContain('/cruise%2Fid/availability?')
    expect(url).toContain('ages%5B%5D=34')
    expect(url).toContain('include_guest_prices=true')
  })

  it('adds idempotency keys to mutations', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: { id: 'hold' } }), { status: 201 }))
    const client = new CoreCruiseClient({ token: 'secret', fetch: fetcher })

    await client.createHold({ date_card_id: 'date', category_code: 'IC', guest_count: 2 }, 'stable-key')

    expect(fetcher.mock.calls[0][1].headers['Idempotency-Key']).toBe('stable-key')
  })

  it('returns structured API errors', async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ message: 'validation failed', errors: { adults: ['required'] } }), {
        status: 422,
      })
    )
    const client = new CoreCruiseClient({ token: 'secret', fetch: fetcher })

    await expect(client.getCruiseAvailability('x', { adults: 0 })).rejects.toMatchObject({
      name: 'CoreCruiseApiError',
      status: 422,
      message: 'validation failed',
    } satisfies Partial<CoreCruiseApiError>)
  })
})
