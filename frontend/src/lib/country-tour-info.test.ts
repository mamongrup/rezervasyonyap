import { describe, expect, it } from 'vitest'
import { countryTourInfoRows, parseCountryTourInfo } from './country-tour-info'

describe('countryTourInfoRows', () => {
  it('builds display rows from country_info_json', () => {
    const info = parseCountryTourInfo({
      languages: ['Fransızca'],
      currencies: ['Euro'],
      time_difference: '-1',
      voltage: '220',
      general_description: 'Paris başkentli ülke.',
      country_phone_code: '33',
      consulate_phone: '+90 312 000 0000',
      taxes: '%20 KDV',
      tipping: '%10 bahşiş',
    })

    const rows = countryTourInfoRows(info)
    expect(rows.map((r) => r.label)).toEqual([
      'Konuşulan Dil',
      'Para Birimi',
      'Saat Farkı',
      'Voltaj',
      'Genel',
      'Telefon',
      'Vergiler',
      'Bahşiş',
    ])
    expect(rows.find((r) => r.label === 'Telefon')?.value).toContain('Ülke kodu: 33')
  })
})
