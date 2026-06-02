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
    expect(parsed.programHtml).toContain('Paris')
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
    const raw = `1.Gün Test\nBody.\nGENEL ŞARTLAR 1- Birinci madde. 2- İkinci madde.`
    const parsed = parseTourDescription(raw)
    const general = parsed.infoSections.find((s) => s.id === 'tour-section-general-terms')

    expect(general?.html).toContain('Birinci madde')
    expect(general?.html).not.toMatch(/1-\s*Birinci/)
  })
})
