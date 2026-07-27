import { describe, expect, it } from 'vitest'
import { parsePublicMinistryLicenseRef } from '@/lib/ministry-license-ref'

describe('parsePublicMinistryLicenseRef', () => {
  it('returns plain certificate numbers', () => {
    expect(parsePublicMinistryLicenseRef('07-1740')).toBe('07-1740')
  })

  it('extracts certificate_number from Bravo tourism JSON', () => {
    expect(
      parsePublicMinistryLicenseRef(
        JSON.stringify({ certificate_number: '07-574', owner_phone: '0555' }),
      ),
    ).toBe('07-574')
  })

  it('hides JSON when certificate fields are null (no PII leak)', () => {
    const raw = JSON.stringify({
      certificate: null,
      certificate_number: null,
      owner_name_surname: 'Villa Sahibi',
      owner_phone: '0 553 639 28 42',
      owner_tc: null,
      owner_iban: null,
    })
    expect(parsePublicMinistryLicenseRef(raw)).toBeNull()
  })

  it('rejects plain text that embeds owner_phone', () => {
    expect(parsePublicMinistryLicenseRef('owner_phone:0555')).toBeNull()
  })
})
