import { describe, expect, it } from 'vitest'
import { buildHotelFaqItems, isHotelPolicyFaqQuestion } from './hotel-faq-items'

describe('hotel FAQ policy deduplication', () => {
  it('Kurallar bölümündeki politikaları SSS içinde tekrar etmez', () => {
    const items = buildHotelFaqItems(
      {
        checkInLine: 'Giriş: 14:00',
        checkOutLine: 'Çıkış: 12:00',
        prepaymentNote: 'Ön ödeme %20',
        cancellationText: 'İptal koşulları uygulanır.',
        petPolicyText: 'Evcil hayvan kabul edilmez.',
        ministryLicenseRef: '12345',
        hasBreakfastIncluded: true,
        customFaqItems: [
          { q: 'Check-in saati nedir?', a: '14:00' },
          { q: 'Spa bulunuyor mu?', a: 'Evet.' },
        ],
        includePolicyItems: false,
      },
      {}
    )

    expect(items.map((item) => item.q)).toEqual(['Bu otelde kahvaltı sunuluyor mu?', 'Spa bulunuyor mu?'])
  })

  it('Türkçe ve İngilizce politika sorularını tanır', () => {
    expect(isHotelPolicyFaqQuestion('Giriş ve çıkış saatleri nedir?')).toBe(true)
    expect(isHotelPolicyFaqQuestion('Can I cancel my booking?')).toBe(true)
    expect(isHotelPolicyFaqQuestion('Otelin havuzu var mı?')).toBe(false)
  })
})
