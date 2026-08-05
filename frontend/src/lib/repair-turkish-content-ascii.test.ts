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

  it('restores Şimşek Villa style prose leftovers after 412', () => {
    const raw = `Kaş'?n Bay?nd?r Mahallesinde konumlanan Villamız, tasarlanm?şt?r.
??k dizayn edilmi?tir. Villamız?n bahçesi. yap?lm??t?r. seçilmi?tir.
kenar?nda temizli?i ihtiyaçlar?n?z getirdi?imizde ihtiyac?n?z her ?eye olacakt?r.`
    const fixed = repairTurkishContentAscii(raw)
    expect(fixed).toContain("Kaş'ın Bayındır")
    expect(fixed).toContain('tasarlanmıştır')
    expect(fixed).toContain('şık dizayn edilmiştir')
    expect(fixed).toContain('Villamızın')
    expect(fixed).toContain('yapılmıştır')
    expect(fixed).toContain('seçilmiştir')
    expect(fixed).toContain('kenarında')
    expect(fixed).toContain('temizliği')
    expect(fixed).toContain('ihtiyaçlarınızı')
    expect(fixed).toContain('getirdiğimizde')
    expect(fixed).toContain('ihtiyacınız')
    expect(fixed).toContain('her şeye')
    expect(fixed).toContain('olacaktır')
    expect(fixed).not.toMatch(/\?/)
  })
})
