import { describe, expect, it } from 'vitest'
import { siteOriginForDeploymentHost } from '@/lib/resolve-canonical-base-url'

describe('siteOriginForDeploymentHost', () => {
  it('maps brand hosts to https apex origins', () => {
    expect(siteOriginForDeploymentHost('rezervasyonyap.com.tr')).toBe(
      'https://rezervasyonyap.com.tr',
    )
    expect(siteOriginForDeploymentHost('www.rezervasyonyap.com.tr')).toBe(
      'https://rezervasyonyap.com.tr',
    )
    expect(siteOriginForDeploymentHost('reservationinturkey.com')).toBe(
      'https://reservationinturkey.com',
    )
    expect(siteOriginForDeploymentHost('www.reservationinturkey.com')).toBe(
      'https://reservationinturkey.com',
    )
    expect(siteOriginForDeploymentHost('www.rezervasyonyap.tr')).toBe('https://rezervasyonyap.tr')
  })

  it('ignores unknown hosts and strips ports / forwarded lists', () => {
    expect(siteOriginForDeploymentHost('evil.example')).toBe('')
    expect(siteOriginForDeploymentHost('localhost:3000')).toBe('')
    expect(siteOriginForDeploymentHost('rezervasyonyap.com.tr:443, other.host')).toBe(
      'https://rezervasyonyap.com.tr',
    )
  })
})
