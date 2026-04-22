/** Türkçe — `navMenus.en` ile aynı anahtar yapısı */
export const navMenus = {
  catalogMenu: {
    buttonLabel: 'Katalog',
    footerDoc: 'Yolculuğunuza başlayın',
    footerDescription: 'Konaklama, araç kiralama, tur ve deneyimleri tek yerden keşfedin',
    items: {
      '1': {
        title: 'Oteller ve tatil evleri',
        description: 'Otel, villa ve günlük kiralık konaklama',
      },
      '2': {
        title: 'Yat kiralama',
        description: 'Gulet, katamaran ve motor yat',
      },
      '3': {
        title: 'Araç kiralama',
        description: 'Yolculuğunuza uygun aracı bulun',
      },
      '4': {
        title: 'Turlar ve aktiviteler',
        description: 'Rehberli turlar ve yapılacaklar',
      },
      '5': {
        title: 'Kruvaziyer',
        description: 'Akdeniz ve Ege hatları',
      },
      '6': {
        title: 'Feribot',
        description: 'Türkiye, Yunanistan, Kıbrıs seferleri',
      },
      '7': {
        title: 'Transfer',
        description: 'Havalimanı ve özel transfer',
      },
      '8': {
        title: 'Uçuşlar',
        description: 'Uçuş ara ve karşılaştır',
      },
      '9': {
        title: 'Vize hizmetleri',
        description: '180+ ülke için başvuru desteği',
      },
      '10': {
        title: 'Hac ve Umre',
        description: 'Kutsal şehirlere yönelik paketler',
      },
    },
  },
  megaMenu: {
    buttonLabel: 'Kategoriler',
    groups: {
      '1': {
        title: 'Konaklama',
        links: {
          '1-1': 'Oteller',
          '1-2': 'Tatil evleri ve villalar',
          '1-3': 'Yat kiralama',
        },
      },
      '1b': {
        title: 'Deneyimler',
        links: {
          '1b-1': 'Turlar',
          '1b-2': 'Aktiviteler',
          '1b-3': 'Kruvaziyer',
          '1b-4': 'Hac ve Umre',
          '1b-5': 'Vize hizmetleri',
        },
      },
      '1c': {
        title: 'Ulaşım',
        links: {
          '1c-1': 'Uçak bileti',
          '1c-2': 'Araç kiralama',
          '1c-3': 'Feribot',
          '1c-4': 'Transfer',
        },
      },
      '2': {
        title: 'Örnek ilanlar',
        links: {
          '2-1': 'Otel ilanı',
          '2-2': 'Araç ilanı',
          '2-3': 'Deneyim ilanı',
        },
      },
      '4': {
        title: 'Diğer sayfalar',
        links: {
          '4-1': 'Ev sahibi profili',
          '4-2': 'Blog',
          '4-3': 'Ödeme',
          '4-5': 'İletişim',
          '4-6': 'Giriş / Kayıt',
          '4-8': 'Hesabım',
          '4-7': 'İlan ver',
        },
      },
    },
    featured: {
      badge: 'Öne çıkan',
      cta: 'Keşfet',
      title: 'Roma, İtalya',
      description: 'Ebedi Şehir’de seçilmiş konaklama ve deneyimler.',
    },
  },
} as const
