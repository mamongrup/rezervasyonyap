import { describe, expect, it } from 'vitest'

import {
  applyBrandingDomainOverrides,
  clearDomainLogoColorOverrides,
  sanitizeDomainOverrides,
} from '@/lib/branding-for-host'

describe('applyBrandingDomainOverrides', () => {
  const branding = {
    logo_text_line1: 'Rezervasyon',
    logo_text_line2: 'Yap',
    logo_text_line1_color: '#171717',
    logo_text_line2_color: '#c2410c',
    domain_overrides: {
      'reservationinturkey.com': {
        logo_text_line1: 'Reservation',
        logo_text_line2: 'Turkey',
        logo_text_line1_color: '#073c6e',
        logo_text_line2_color: '#ff4d00',
      },
    },
  }

  it('uses the apex override for www hosts and preserves exact colors', () => {
    expect(applyBrandingDomainOverrides(branding, 'www.reservationinturkey.com')).toMatchObject({
      logo_text_line1: 'Reservation',
      logo_text_line2: 'Turkey',
      logo_text_line1_color: '#073c6e',
      logo_text_line2_color: '#ff4d00',
    })
  })

  it('keeps the default branding on another domain', () => {
    expect(applyBrandingDomainOverrides(branding, 'rezervasyonyap.tr')).toMatchObject({
      logo_text_line1: 'Rezervasyon',
      logo_text_line2: 'Yap',
      logo_text_line1_color: '#171717',
      logo_text_line2_color: '#c2410c',
    })
  })

  it('applies a partial color override without losing the other logo fields', () => {
    const withPartialOverride = {
      ...branding,
      domain_overrides: {
        'rezervasyonyap.tr': {
          logo_text_line2_color: '#004cff',
        },
      },
    }

    expect(applyBrandingDomainOverrides(withPartialOverride, 'www.rezervasyonyap.tr')).toMatchObject({
      logo_text_line1: 'Rezervasyon',
      logo_text_line2: 'Yap',
      logo_text_line1_color: '#171717',
      logo_text_line2_color: '#004cff',
    })
  })
})

describe('sanitizeDomainOverrides', () => {
  it('normalizes www keys and removes empty values', () => {
    expect(
      sanitizeDomainOverrides({
        'www.reservationinturkey.com': {
          logo_text_line1: ' Reservation ',
          logo_text_line2: ' ',
        },
      }),
    ).toEqual({
      'reservationinturkey.com': {
        logo_text_line1: 'Reservation',
      },
    })
  })
})

describe('clearDomainLogoColorOverrides', () => {
  it('clears the selected color on every domain and preserves other overrides', () => {
    expect(
      clearDomainLogoColorOverrides(
        {
          'rezervasyonyap.tr': {
            logo_text_line1: 'Rezervasyon',
            logo_text_line1_color: '#111111',
            logo_text_line2_color: '#fb8804',
          },
          'reservationinturkey.com': {
            logo_text_line2: 'Turkey',
            logo_text_line2_color: '#ff4d00',
          },
        },
        'logo_text_line2_color',
      ),
    ).toEqual({
      'rezervasyonyap.tr': {
        logo_text_line1: 'Rezervasyon',
        logo_text_line1_color: '#111111',
      },
      'reservationinturkey.com': {
        logo_text_line2: 'Turkey',
      },
    })
  })

  it('removes a domain entry that only contained the cleared color', () => {
    expect(
      clearDomainLogoColorOverrides(
        {
          'rezervasyonyap.tr': {
            logo_text_line1_color: '#111111',
          },
        },
        'logo_text_line1_color',
      ),
    ).toEqual({})
  })
})
