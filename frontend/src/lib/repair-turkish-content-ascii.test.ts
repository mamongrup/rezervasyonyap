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

  it('restores Şimşek Villa style prose leftovers after 412/415', () => {
    const raw = `Kaş'?n Bay?nd?r Mahallesinde konumlanan Villamız, tasarlanm?şt?r.
??k dizayn edilmi?tir. Villamız?n bahçesi. yap?lm??t?r. seçilmi?tir.
kenar?nda temizli?i ihtiyaçlar?n?z getirdi?imizde ihtiyac?n?z her ?eye olacakt?r.
Villamızın bahçesinde g?zel bir havuz. ?zel havuz ve ?cret alınmaz.`
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
    expect(fixed).toContain('güzel bir havuz')
    expect(fixed).toContain('özel havuz')
    expect(fixed).toContain('ücret')
    expect(fixed).not.toMatch(/\?/)
  })

  it('covers all Turkish letters upper and lower without breaking real questions', () => {
    const raw =
      "ç?k?? Ç?k?? do?a Do?a g?zel G?zel ö?le Ö?LE i?in İ?in ?ehir ?OCUK ?cret ?zel Nedir?"
    const fixed = repairTurkishContentAscii(raw)
    expect(fixed).toContain('çıkış')
    expect(fixed).toContain('Çıkış')
    expect(fixed).toContain('doğa')
    expect(fixed).toContain('Doğa')
    expect(fixed).toContain('güzel')
    expect(fixed).toContain('Güzel')
    expect(fixed).toContain('öğle')
    expect(fixed).toContain('ÖĞLE')
    expect(fixed).toContain('için')
    expect(fixed).toContain('İçin')
    expect(fixed).toContain('şehir')
    expect(fixed).toContain('ÇOCUK')
    expect(fixed).toContain('ücret')
    expect(fixed).toContain('özel')
    expect(fixed).toContain('Nedir?')
    expect(fixed).not.toMatch(/Nedirı/)
  })

  it('repairs Turkish characters hidden behind HTML apostrophe entities', () => {
    const raw =
      '<p>Villa Şimşek 2, Kaş&rsquo;?n Bayındır bölgesindedir. TV ve uydu alıcıs? bulunur.</p>'
    const fixed = repairTurkishContentAscii(raw)

    expect(fixed).toContain('Kaş&rsquo;ın')
    expect(fixed).toContain('uydu alıcısı')
    expect(fixed).not.toContain('?')
  })

  it('repairs remaining Şimşek Villa 1 and Çavdır Egemen patterns', () => {
    const raw = `Tam donanımlı mutfa?? ve konuklarım?zın kullanacağı alan.
Villa ?im?e?in bahçesinde ta? barbekü bulunur.
Çavdır mevkiinde konnumlanm?? olup tüm ihtiyaçlarınızı? kar??layacak şekilde hazırlanmıştır.`
    const fixed = repairTurkishContentAscii(raw)

    expect(fixed).toContain('Tam donanımlı mutfağı')
    expect(fixed).toContain('konuklarımızın')
    expect(fixed).toContain('Villa Şimşeğin')
    expect(fixed).toContain('taş barbekü')
    expect(fixed).toContain('konumlanmış')
    expect(fixed).toContain('tüm ihtiyaçlarınızı karşılayacak')
    expect(fixed).not.toContain('?')
  })
})
