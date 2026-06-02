import { describe, expect, it } from 'vitest'
import { parseTourDescription } from './tour-description-parser'

const SAMPLE_TAIL = `
Konaklama ;
Otellerinin Giriş saatleri 15:00 – 17:00 arası / Çıkış saatleri 10:00 – 12:00 arasındadır.

GENEL ŞARTLAR 1- Genel Şartlar tur programının ayrılmaz bir parçasıdır. 2- Gezi için yeterli katılım sağlanamadığı takdirde tur iptal edilebilir.
İptal ve değişiklik 4- Misafirler tur çıkış tarihinden 30 gün öncesine kadar iptal edebilir.
Ücretli: Vize ücreti
 Kişisel harcamalar
Dahil: Uçak bileti
 Kahvaltı
`

describe('parseTourDescription', () => {
  it('splits program days from info sections', () => {
    const raw = `1.Gün İstanbul – Paris\nParis şehir turu.\n2.Gün Paris\nEyfel Kulesi ziyareti.${SAMPLE_TAIL}`
    const parsed = parseTourDescription(raw)

    expect(parsed.programHtml).toContain('İstanbul – Paris')
    expect(parsed.programHtml).toContain('1.Gün İstanbul – Paris')
    expect(parsed.programHtml).toContain('2.Gün Paris')
    expect(parsed.programHtml).not.toContain('GENEL ŞARTLAR')
    expect(parsed.infoSections.map((s) => s.title)).toEqual([
      'Genel Şartlar',
      'İptal ve değişiklik',
      'Ücretli',
      'Dahil',
    ])
  })

  it('moves flight footnotes into Uçuşlar Hakkında when present', () => {
    const raw = `1.Gün Test\nProgram metni.\nUçuşlar Hakkında 10- Uçuş kuralları geçerlidir.\nKalkış ve varış saatleri yerel saatlerdir.\nGruplarda fiyatlar geçerli değildir, özel fiyatlarımızı sorunuz.`
    const parsed = parseTourDescription(raw)

    const flights = parsed.infoSections.find((s) => s.id === 'tour-section-flights-info')
    expect(flights?.html).toContain('Kalkış ve varış saatleri')
    expect(flights?.html).toContain('Uçuş kuralları')
  })

  it('formats numbered clauses without leading numbers in list items', () => {
    const raw = `1.Gün Test\nBody.\nGENEL ŞARTLAR 1- Genel Şartlar tur programının ayrılmaz bir parçasıdır. 2- İkinci madde.`
    const parsed = parseTourDescription(raw)
    const general = parsed.infoSections.find((s) => s.id === 'tour-section-general-terms')

    expect(general?.html).toContain('Genel Şartlar tur programının')
    expect(general?.html).toContain('İkinci madde')
    expect(general?.html).not.toMatch(/1-\s*Genel/)
    expect(general?.html).not.toMatch(/2-\s*İkinci/)
  })

  it('strips leading numbers from İptal ve değişiklik', () => {
    const raw = `1.Gün Test\nBody.\nGENEL ŞARTLAR 1- Madde.\nİptal ve değişiklik 4- Misafirler tur çıkış tarihinden 30 gün öncesine kadar iptal edebilir.`
    const parsed = parseTourDescription(raw)
    const cancel = parsed.infoSections.find((s) => s.id === 'tour-section-cancellation')

    expect(cancel?.html).toContain('Misafirler tur çıkış tarihinden')
    expect(cancel?.html).not.toMatch(/4-\s*Misafirler/)
  })

  it('replaces Wtatil with rezervasyonyap.com.tr', () => {
    const raw = `1.Gün Test\nBody.\nGENEL ŞARTLAR 1- Wtatil gezi iptal edebilir. 2- Wtatil'den alınmış uçuş iade edilir.`
    const parsed = parseTourDescription(raw)
    const general = parsed.infoSections.find((s) => s.id === 'tour-section-general-terms')

    expect(general?.html).toContain('rezervasyonyap.com.tr')
    expect(general?.html).not.toMatch(/wtatil/i)
  })
})
