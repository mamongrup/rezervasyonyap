import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  hostApexKey,
  isSameDeploymentSiteHost,
  shouldPreferPageOriginForApi,
} from '@/lib/api-origin'

describe('hostApexKey', () => {
  it('strips www and lowercases', () => {
    expect(hostApexKey('WWW.RezervasyonYap.TR')).toBe('rezervasyonyap.tr')
    expect(hostApexKey('www.rezervasyonyap.com.tr')).toBe('rezervasyonyap.com.tr')
  })
})

describe('isSameDeploymentSiteHost', () => {
  it('accepts brand domains from DOMAIN.md', () => {
    expect(isSameDeploymentSiteHost('rezervasyonyap.tr')).toBe(true)
    expect(isSameDeploymentSiteHost('www.rezervasyonyap.com.tr')).toBe(true)
    expect(isSameDeploymentSiteHost('reservationinturkey.com')).toBe(true)
    expect(isSameDeploymentSiteHost('www.tatil-evi.com')).toBe(true)
  })

  it('rejects unrelated hosts', () => {
    expect(isSameDeploymentSiteHost('example.com')).toBe(false)
    expect(isSameDeploymentSiteHost('api.rezervasyonyap.tr')).toBe(false)
  })
})

describe('shouldPreferPageOriginForApi', () => {
  it('matches plain www/apex of the same host', () => {
    expect(shouldPreferPageOriginForApi('rezervasyonyap.tr', 'www.rezervasyonyap.tr')).toBe(true)
  })

  it('treats .tr and .com.tr brand pair as same deployment', () => {
    expect(
      shouldPreferPageOriginForApi('rezervasyonyap.tr', 'www.rezervasyonyap.com.tr'),
    ).toBe(true)
    expect(
      shouldPreferPageOriginForApi('www.rezervasyonyap.com.tr', 'rezervasyonyap.tr'),
    ).toBe(true)
  })

  it('treats international / tatil-evi aliases as same deployment vs primary API host', () => {
    expect(
      shouldPreferPageOriginForApi('rezervasyonyap.tr', 'www.reservationinturkey.com'),
    ).toBe(true)
    expect(shouldPreferPageOriginForApi('rezervasyonyap.tr', 'tatil-evi.com')).toBe(true)
  })

  it('does not collapse unrelated API hosts', () => {
    expect(shouldPreferPageOriginForApi('cdn.example.com', 'rezervasyonyap.tr')).toBe(false)
  })
})

describe('apiOriginForFetch (browser production)', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
    vi.resetModules()
  })

  it('uses current page origin when built API URL is another brand domain', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('NEXT_PUBLIC_API_URL', 'https://rezervasyonyap.tr')
    vi.stubGlobal('window', {
      location: {
        hostname: 'www.rezervasyonyap.com.tr',
        origin: 'https://www.rezervasyonyap.com.tr',
      },
    })
    const { apiOriginForFetch } = await import('@/lib/api-origin')
    expect(apiOriginForFetch()).toBe('https://www.rezervasyonyap.com.tr')
  })
})
