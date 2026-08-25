import { describe, expect, it } from 'vitest'

import { listingHostForSection } from './listings'

describe('listingHostForSection', () => {
  it('does not treat a listing handle as a public author profile', () => {
    const host = listingHostForSection('Prime Villa 2', {
      displayName: 'Prime Villa 2',
      handle: 'prime-villa-2',
    })

    expect(host.handle).toBe('prime-villa-2')
    expect(host.hasPublicProfile).toBe(false)
  })

  it('keeps an explicitly verified public profile available', () => {
    const host = listingHostForSection('Prime Villa 2', {
      displayName: 'Acme Travel',
      handle: 'acme-travel',
      hasPublicProfile: true,
    })

    expect(host.hasPublicProfile).toBe(true)
  })
})
