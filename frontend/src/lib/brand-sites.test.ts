import { describe, expect, it } from 'vitest'
import { brandSitesExcludingHost, DEFAULT_DOMAIN_SEO } from '@/lib/brand-sites'
import { resolveSearchConsoleVerification } from '@/lib/request-branding-seo'

describe('brand-sites', () => {
  it('excludes the current apex from sister links', () => {
    const sisters = brandSitesExcludingHost('www.rezervasyonyap.com.tr')
    expect(sisters.map((s) => s.apex)).toEqual(['rezervasyonyap.tr', 'reservationinturkey.com'])
  })

  it('has distinct SEO copy per brand domain', () => {
    const a = DEFAULT_DOMAIN_SEO['rezervasyonyap.tr']!.site_description
    const b = DEFAULT_DOMAIN_SEO['rezervasyonyap.com.tr']!.site_description
    const c = DEFAULT_DOMAIN_SEO['reservationinturkey.com']!.site_description
    expect(a).not.toBe(b)
    expect(b).not.toBe(c)
    expect(DEFAULT_DOMAIN_SEO['reservationinturkey.com']!.site_name).toBe('Reservation in Turkey')
  })
})

describe('resolveSearchConsoleVerification', () => {
  it('prefers per-host token then global', () => {
    expect(
      resolveSearchConsoleVerification(
        {
          search_console_verification: 'GLOBAL',
          search_console_verification_by_host: {
            'reservationinturkey.com': 'RIT_TOKEN',
          },
        },
        'www.reservationinturkey.com',
      ),
    ).toBe('RIT_TOKEN')
    expect(
      resolveSearchConsoleVerification({ search_console_verification: 'GLOBAL' }, 'rezervasyonyap.tr'),
    ).toBe('GLOBAL')
  })
})
