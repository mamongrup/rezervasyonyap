import { describe, expect, it } from 'vitest'
import { repairTurkishContentAscii } from './repair-turkish-content-ascii'

describe('repairTurkishContentAscii', () => {
  it('restores villa description and rules Turkish characters', () => {
    const raw = `Deniz Manzaral?, Muhafazakar, Balay? Villas?
Balay? Villam?z, Kalkan merkezine yak?n … muhte?em deniz manzaral? balay? villalar?m?zdand?r.
Giri? - Ç?k?? Saatleri : Tüm villalar?m?za ilk gün giri? saat 16:00'dan sonra yap?lmaktad?r.
kontrol yap?ld??? için ayr?l??tan sonra … yard?mc? olamayaca??m?z?`

    const fixed = repairTurkishContentAscii(raw)
    expect(fixed).toContain('Deniz Manzaralı')
    expect(fixed).toContain('Balayı Villası')
    expect(fixed).toContain('Villamız')
    expect(fixed).toContain('yakın')
    expect(fixed).toContain('muhteşem')
    expect(fixed).toContain('villalarımızdandır')
    expect(fixed).toContain('Giriş - Çıkış')
    expect(fixed).toContain('yapılmaktadır')
    expect(fixed).toContain('yapıldığı')
    expect(fixed).toContain('ayrılıştan')
    expect(fixed).toContain('yardımcı olamayacağımızı')
    expect(fixed).not.toMatch(/\?/)
  })
})
