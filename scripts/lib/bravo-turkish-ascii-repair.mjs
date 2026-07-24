/**
 * Bravo aktarımında Türkçe harfler ASCII `?` ile değiştirilmiş (charset kaybı).
 * Tersine çevrilemez encoding dönüşümü değil; bilinen kalıplar ile onarım.
 */

/** Uzun / spesifik kalıplar önce */
export const BRAVO_TURKISH_ASCII_PAIRS = [
  // Yer adları / başlıklar
  ['?l?deniz', 'Ölüdeniz'],
  ['?al??', 'Çalış'],
  ['Ba?lang??', 'Başlangıç'],
  ['Ba?lang?', 'Başlangı'],
  ['Ba?l?yor', 'Başlıyor'],
  ['Kayak?y', 'Kayaköy'],
  ['Sakl?kent', 'Saklıkent'],
  ['Gelemi?', 'Gelemiş'],
  ['Ovac?k', 'Ovacık'],
  ['Bulvar?', 'Bulvarı'],
  ['T?rkiye', 'Türkiye'],
  ['Mu?la', 'Muğla'],
  ['Plaj?', 'Plajı'],
  ['?ay?', 'Çayı'],
  ['E?itim', 'Eğitim'],
  ['Fo?a', 'Foça'],
  ['Kaputa?', 'Kaputaş'],
  ['?slamlar', 'İslamlar'],
  ['?avd?r', 'Çavdır'],
  ['?im?ek', 'Şimşek'],
  ['Tahanc?', 'Tahancı'],
  ['K?sem', 'Kösem'],
  ['S?la', 'Sıla'],
  ['?ato', 'Şato'],
  ['?i?e?i', 'Çiçeği'],
  ['Ka?', 'Kaş'],
  ['?zel', 'Özel'],
  // İçerikte sık geçen parçalar
  ['muhte?em', 'muhteşem'],
  ['koylar?', 'koyları'],
  ['Ke?if', 'Keşif'],
  ['Liman?', 'Limanı'],
  ['ye?il', 'yeşil'],
  ['tonlar?', 'tonları'],
  ['Do?an?n', 'Doğanın'],
  ['Do?a', 'Doğa'],
  ['do?al', 'doğal'],
  ['E?siz', 'Eşsiz'],
  ['e?siz', 'eşsiz'],
  ['ola?an', 'olağan'],
  ['sunabilece?iniz', 'sunabileceğiniz'],
  ['Maceran?z', 'Maceranız'],
  ['maceran?z', 'maceranız'],
  ['dal??', 'dalış'],
  ['merakl?', 'meraklı'],
  ['e?li?i', 'eşliği'],
  ['e?li?', 'eşli'],
  ["'n?n", "'nın"],
  ['n?n ', 'nın '],
  ['Kurslar?', 'Kursları'],
  ['kurslar?', 'kursları'],
  ['Nas?l', 'Nasıl'],
  ['nas?l', 'nasıl'],
  ['Yap?l?r', 'Yapılır'],
  ['yap?l?r', 'yapılır'],
  ['Yap?l', 'Yapıl'],
  ['E?lence', 'Eğlence'],
  ['e?lence', 'eğlence'],
  ['H?z', 'Hız'],
  ['h?z', 'hız'],
  ['?renmeye', 'ğrenmeye'],
  ['g&uuml;zell', 'g&uuml;zell'], // no-op placeholder keep entities
  ['Cal??', 'Çalış'],
  ['&Ccedil;al??', '&Ccedil;alış'],
  ['al?? ', 'alış '],
  // Yaygın ek / gövde kalıpları (açıklama HTML)
  ['sular?', 'suları'],
  ['&ccedil;?kar?n', '&ccedil;ıkarın'],
  ['&ccedil;?kar', '&ccedil;ıkar'],
  ['yan? ', 'yanı '],
  ['s?ra ', 'sıra '],
  ['sualt?', 'sualtı'],
  ['d&uuml;nyas?', 'd&uuml;nyası'],
  ['canl?', 'canlı'],
  ['tan??', 'tanı'],
  ['ba?layan', 'başlayan'],
  ['ba?lang', 'başlang'],
  ['dalg?&ccedil;', 'dalgı&ccedil;'],
  ['dalg?', 'dalgı'],
  ['e?itmen', 'eğitmen'],
  ['haz?rlan', 'hazırlan'],
  ['e?itim', 'eğitim'],
  ['sa?lar', 'sağlar'],
  ['sa?larken', 'sağlarken'],
  ['noktalar?', 'noktaları'],
  ['ke?fet', 'keşfet'],
  ['Detaylar?', 'Detayları'],
  ['detaylar?', 'detayları'],
  ['farkl?', 'farklı'],
  ['?norkel', 'şnorkel'],
  ['yakla??k', 'yaklaşık'],
  ['Kat?l?mc?', 'Katılımcı'],
  ['kat?l?mc?', 'katılımcı'],
  ['Say?s?', 'Sayısı'],
  ['say?s?', 'sayısı'],
  ['ki?ilik', 'kişilik'],
  ['ki?i', 'kişi'],
  ['Dal??', 'Dalış'],
  ['dal??', 'dalış'],
  ['&ccedil;e?itlili?i', '&ccedil;eşitliliği'],
  ['&ccedil;e?it', '&ccedil;eşit'],
  ['manzaralar?', 'manzaraları'],
  ['bal?k', 'balık'],
  ['y?ld?z', 'yıldız'],
  ['kar??la?', 'karşılaş'],
  ['kat?l', 'katıl'],
  ['arkada?', 'arkadaş'],
  ['ya?amak', 'yaşamak'],
  ['ya?a', 'yaşa'],
  ['f?rsat', 'fırsat'],
  ['ge&ccedil;irece?iniz', 'ge&ccedil;ireceğiniz'],
  ['Foto?raf', 'Fotoğraf'],
  ['foto?raf', 'fotoğraf'],
  ['Ki?isel', 'Kişisel'],
  ['ki?isel', 'kişisel'],
  ['?&ccedil;ecek', 'İ&ccedil;ecek'],
  ['g&uuml;zelliklerin', 'g&uuml;zelliklerin'],
  ['g&uuml;zel', 'g&uuml;zel'],
  ['al?c?', 'alıcı'],
  ['yan?nda', 'yanında'],
  ['s?rada', 'sırada'],
  ['i&ccedil;in', 'i&ccedil;in'],
  ['Taraf?ndan', 'Tarafından'],
  ['taraf?ndan', 'tarafından'],
  ['Ba?l?', 'Bağlı'],
  ['ba?l?', 'bağlı'],
  ['Yeme?i', 'Yemeği'],
  ['yeme?i', 'yemeği'],
  ['Sigortas?', 'Sigortası'],
  ['sigortas?', 'sigortası'],
  ['Harcamalar', 'Harcamalar'],
  ['Unutulmaz', 'Unutulmaz'],
  ['deneyim', 'deneyim'],
  ['&Ouml;?le', '&Ouml;ğle'],
  ['&Ouml;?ren', '&Ouml;ğren'],
]

export function repairBravoTurkishAscii(input) {
  if (input == null) return input
  let out = String(input)
  for (const [from, to] of BRAVO_TURKISH_ASCII_PAIRS) {
    if (from === to) continue
    if (out.includes(from)) out = out.split(from).join(to)
  }
  return out
}

export function repairBravoTurkishDeep(value) {
  if (typeof value === 'string') return repairBravoTurkishAscii(value)
  if (Array.isArray(value)) return value.map(repairBravoTurkishDeep)
  if (value && typeof value === 'object') {
    const out = {}
    for (const [k, v] of Object.entries(value)) out[k] = repairBravoTurkishDeep(v)
    return out
  }
  return value
}
