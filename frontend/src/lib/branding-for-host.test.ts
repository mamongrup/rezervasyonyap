import { describe, expect, it } from 'vitest'

import {
  applyBrandingDomainOverrides,
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
